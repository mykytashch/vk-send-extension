package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "os/signal"
    "strconv"
    "sync"
    "syscall"
    "time"

    "github.com/gorilla/websocket"
    _ "github.com/mattn/go-sqlite3"
)

type ServerState struct {
    CurrentMessageIndex int  `json:"currentMessageIndex"`
    Paused              bool `json:"paused"`
}

type Message struct {
    Question string `json:"question"`
    Answer   string `json:"answer"`
}

type Command struct {
    Type    string `json:"type"`
    Message string `json:"message"`
}

var (
    state       ServerState
    dialog      []Message
    stateChan   = make(chan ServerState, 1)
    dialogChan  = make(chan []Message, 1)
    stateLock   = &sync.Mutex{}
    dialogLock  = &sync.Mutex{}
    upgrader    = websocket.Upgrader{}
    db          *sql.DB
    loadedFiles []string
)

func loadState(ctx context.Context) {
    stateLock.Lock()
    defer stateLock.Unlock()

    row := db.QueryRowContext(ctx, "SELECT * FROM server_state")
    err := row.Scan(&state.CurrentMessageIndex, &state.Paused)
    if err != nil {
        fmt.Println("Could not load server state, initializing to default values")
        state = ServerState{CurrentMessageIndex: 0, Paused: false}
    }
}

func saveState(ctx context.Context) {
    stateLock.Lock()
    defer stateLock.Unlock()

    _, err := db.ExecContext(ctx, "UPDATE server_state SET current_message_index = ?, paused = ?", state.CurrentMessageIndex, state.Paused)
    if err != nil {
        fmt.Println("Could not save server state:", err)
    }
}

func loadMessages(employeeID int) []Message {
    messagesFile := fmt.Sprintf("messages%d.json", employeeID)

    if _, err := os.Stat(messagesFile); os.IsNotExist(err) {
        fmt.Printf("Messages file %s does not exist\n", messagesFile)
        return []Message{}
    }

    file, err := ioutil.ReadFile(messagesFile)
    if err != nil {
        fmt.Printf("Could not open messages file %s, initializing to default values\n", messagesFile)
        return []Message{}
    }

    var loadedMessages []Message
    err = json.Unmarshal(file, &loadedMessages)
    if err != nil {
        fmt.Printf("Could not parse messages file %s, initializing to default values\n", messagesFile)
        return []Message{}
    }

    loadedFiles = append(loadedFiles, messagesFile)
    fmt.Println("Loaded messages file:", messagesFile)
    return loadedMessages
}

func loadDialog(ctx context.Context) {
    dialogLock.Lock()
    defer dialogLock.Unlock()

    rows, err := db.QueryContext(ctx, "SELECT question, answer FROM dialogs")
    if err != nil {
        fmt.Println("Could not load dialog:", err)
        return
    }
    defer rows.Close()

    dialog = []Message{}
    for rows.Next() {
        var question, answer string
        err := rows.Scan(&question, &answer)
        if err != nil {
            fmt.Println("Error scanning dialog row:", err)
            continue
        }
        dialog = append(dialog, Message{
            Question: question,
            Answer:   answer,
        })
    }

    if err := rows.Err(); err != nil {
        fmt.Println("Error reading dialog rows:", err)
    }

    fmt.Println("Loaded dialog from database")
}

func saveDialog(ctx context.Context, employeeID int) {
    dialogLock.Lock()
    defer dialogLock.Unlock()

    responsesFile := fmt.Sprintf("responses%d.db", employeeID)

    _, err := db.ExecContext(ctx, fmt.Sprintf("ATTACH DATABASE '%s' AS responses", responsesFile))
    if err != nil {
        fmt.Println("Could not attach responses database:", err)
        return
    }

    _, err = db.ExecContext(ctx, "CREATE TABLE IF NOT EXISTS responses (question TEXT, answer TEXT)")
    if err != nil {
        fmt.Println("Could not create responses table:", err)
        db.ExecContext(ctx, "DETACH DATABASE responses")
        return
    }

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        fmt.Println("Could not begin transaction for saving dialog:", err)
        db.ExecContext(ctx, "DETACH DATABASE responses")
        return
    }

    stmt, err := tx.PrepareContext(ctx, "INSERT INTO responses (question, answer) VALUES (?, ?)")
    if err != nil {
        fmt.Println("Could not prepare statement for inserting response:", err)
        tx.Rollback()
        db.ExecContext(ctx, "DETACH DATABASE responses")
        return
    }
    defer stmt.Close()

    for _, message := range dialog {
        _, err := stmt.ExecContext(ctx, message.Question, message.Answer)
        if err != nil {
            fmt.Println("Error inserting response:", err)
            tx.Rollback()
            db.ExecContext(ctx, "DETACH DATABASE responses")
            return
        }
    }

    _, err = db.ExecContext(ctx, "DETACH DATABASE responses")
    if err != nil {
        fmt.Println("Could not detach responses database:", err)
        tx.Rollback()
        return
    }

    err = tx.Commit()
    if err != nil {
        fmt.Println("Could not commit transaction for saving dialog:", err)
    }
}



func websocketHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade failed:", err)
        return
    }
    defer conn.Close()

    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            log.Println("WebSocket read failed:", err)
            return
        }

        var command Command
        err = json.Unmarshal(msg, &command)
        if err != nil {
            log.Println("Error decoding command:", err)
            continue
        }

        employeeID, err := strconv.Atoi(command.Message)
        if err != nil {
            log.Println("Invalid employee ID:", err)
            continue
        }

        switch command.Type {
        case "get_current_question_number":
            loadState(r.Context())
            response := struct {
                CurrentQuestionNumber int `json:"currentQuestionNumber"`
            }{
                CurrentQuestionNumber: state.CurrentMessageIndex,
            }
            err = conn.WriteJSON(response)
            if err != nil {
                log.Println("WebSocket write failed:", err)
            }
        case "store_response":
            loadState(r.Context())
            loadDialog(r.Context())

            if state.Paused {
                err = conn.WriteMessage(websocket.TextMessage, []byte(`{"status": "paused"}`))
                if err != nil {
                    log.Println("WebSocket write failed:", err)
                }
                continue
            }

            messages := loadMessages(employeeID)

            if state.CurrentMessageIndex >= len(messages) {
                err = conn.WriteMessage(websocket.TextMessage, []byte(`{"status": "out_of_questions"}`))
                if err != nil {
                    log.Println("WebSocket write failed:", err)
                }
                continue
            }

            dialog = append(dialog, Message{
                Question: messages[state.CurrentMessageIndex].Question,
                Answer:   command.Message,
            })
            state.CurrentMessageIndex++
            saveState(r.Context())
            saveDialog(r.Context(), employeeID)

            err = conn.WriteMessage(websocket.TextMessage, []byte(`{"status": "success"}`))
            if err != nil {
                log.Println("WebSocket write failed:", err)
            }
        case "pause":
            loadState(r.Context())
            state.Paused = true
            saveState(r.Context())
            err = conn.WriteMessage(websocket.TextMessage, []byte(`{"status": "paused"}`))
            if err != nil {
                log.Println("WebSocket write failed:", err)
            }
        case "continue":
            loadState(r.Context())
            state.Paused = false
            saveState(r.Context())
            err = conn.WriteMessage(websocket.TextMessage, []byte(`{"status": "continued"}`))
            if err != nil {
                log.Println("WebSocket write failed:", err)
            }
        }
    }
}


func getMessageHandler(w http.ResponseWriter, r *http.Request) {
    employeeID, _ := strconv.Atoi(r.Header.Get("X-Employee-ID"))

    messages := loadMessages(employeeID)

    stateLock.Lock()
    if state.CurrentMessageIndex >= len(messages) {
        stateLock.Unlock()
        http.Error(w, "No more messages", http.StatusNotFound)
        return
    }

    question := messages[state.CurrentMessageIndex].Question

    state.CurrentMessageIndex++
    saveState(r.Context())
    stateLock.Unlock()

    response := struct {
        Question string `json:"question"`
    }{
        Question: question,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    var err error
    db, err = sql.Open("sqlite3", "C:\\Users\\New\\Desktop\\all projects\\GoLang\\EXTENSION\\dialog.db")
    if err != nil {
        log.Fatal("Could not open database:", err)
    }
    defer db.Close()

    err = db.Ping()
    if err != nil {
        log.Fatal("Database connection failed:", err)
    }

    loadState(context.Background())
    loadDialog(context.Background())
    loadAvailableFiles()


    http.HandleFunc("/message", getMessageHandler)
    http.HandleFunc("/ws", websocketHandler)
    http.HandleFunc("/download", downloadResponsesHandler)


    srv := &http.Server{
        Addr: ":8080",
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("Server listen failed:", err)
        }
    }()

    fmt.Println("Server started")

    // Wait for interrupt signal to gracefully shutdown the server
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    fmt.Println("Shutting down server...")

    // Create a deadline for server shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Shutdown the server
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("Server shutdown failed:", err)
    }

    fmt.Println("Server stopped")
}

func loadAvailableFiles() {
    for employeeID := 1; employeeID <= 2560; employeeID++ {
        messagesFile := fmt.Sprintf("messages%d.json", employeeID)

        if _, err := os.Stat(messagesFile); err == nil {
            loadedFiles = append(loadedFiles, messagesFile)
            fmt.Println("Loaded messages file:", messagesFile)
        }

        responsesFile := fmt.Sprintf("responses%d.db", employeeID)

        if _, err := os.Stat(responsesFile); err == nil {
            err := os.Remove(responsesFile)
            if err != nil {
                fmt.Println("Could not remove old responses file:", err)
            }
        }
    }
}


func downloadResponsesHandler(w http.ResponseWriter, r *http.Request) {
    employeeID, _ := strconv.Atoi(r.Header.Get("X-Employee-ID"))

    responsesFile := fmt.Sprintf("responses%d.db", employeeID)

    if _, err := os.Stat(responsesFile); os.IsNotExist(err) {
        http.Error(w, "Responses file does not exist", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, responsesFile))

    http.ServeFile(w, r, responsesFile)
}

