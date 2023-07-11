package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
)

type Message struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

func main() {
	// Чтение содержимого файла messages.json
	fileData, err := ioutil.ReadFile("messages.json")
	if err != nil {
		fmt.Println("Не удалось прочитать файл messages.json:", err)
		return
	}

	// Разбор содержимого файла в список строк вопросов
	var questions []string
	err = json.Unmarshal(fileData, &questions)
	if err != nil {
		fmt.Println("Ошибка при разборе содержимого messages.json:", err)
		return
	}

	// Создание списка объектов типа Message
	var messages []Message
	for _, question := range questions {
		message := Message{
			Question: question,
			Answer:   "",
		}
		messages = append(messages, message)
	}

	// Преобразование списка объектов Message в JSON
	outputData, err := json.MarshalIndent(messages, "", "    ")
	if err != nil {
		fmt.Println("Ошибка при преобразовании в JSON:", err)
		return
	}

	// Запись JSON в новый файл newmessages.json
	err = ioutil.WriteFile("newmessages.json", outputData, 0644)
	if err != nil {
		fmt.Println("Не удалось записать файл newmessages.json:", err)
		return
	}

	fmt.Println("Файл newmessages.json успешно создан.")
}
