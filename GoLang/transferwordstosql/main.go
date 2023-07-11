package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Открытие текстового файла
	file, err := os.Open("C:/Users/New/Desktop/all projects/GoLang/transferwordstosql/236k-of-words.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	// Чтение содержимого файла
	var words []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		words = append(words, scanner.Text())
	}

	// Подключение к базе данных SQLite
	db, err := sql.Open("sqlite3", "C:/Users/New/Desktop/all projects/GoLang/EXTENSION/dialog.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Создание таблицы "Question_1"
	createTableSQL := `
		CREATE TABLE IF NOT EXISTS Questions_1 (
			QuestionID INTEGER PRIMARY KEY AUTOINCREMENT,
			QuestionText TEXT NOT NULL
		)
	`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	// Вставка слов в таблицу с присвоением новых номеров
	insertSQL := "INSERT INTO Questions_1 (QuestionText) VALUES (?)"
	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}

	for _, word := range words {
		_, err = tx.Stmt(stmt).Exec(word)
		if err != nil {
			log.Fatal(err)
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Data inserted successfully!")

	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}
}
