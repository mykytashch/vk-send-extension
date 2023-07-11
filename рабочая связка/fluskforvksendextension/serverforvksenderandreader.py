import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Загрузка сообщений из файла
with open('messages.json', 'r') as file:
    messages = json.load(file)

# Загрузка состояния из файла
if os.path.exists('state.json'):
    with open('state.json', 'r') as file:
        state = json.load(file)
else:
    state = {'currentMessageIndex': 0, 'responses': []}


@app.route('/get_message', methods=['GET'])
def get_message():
    # Возвращаем все сообщения
    index = state['currentMessageIndex']
    if 0 <= index < len(messages):
        return jsonify({'messages': messages})


@app.route('/store_response', methods=['POST'])
def store_response():
    response = request.get_json()
    message = response.get('message')
    sender = response.get('sender')  # Добавленный параметр sender

    # Сохраняем ответ пользователя
    state['responses'].append({'message': message, 'sender': sender})  # Сохраняем сообщение и отправителя

    # Увеличиваем индекс сообщения
    state['currentMessageIndex'] += 1
    logging.debug(f"Stored response: {message} (sender: {sender})")  # Выводим отправленное сообщение и отправителя
    logging.debug(f"Current message index: {state['currentMessageIndex']}")

    # Сохраняем состояние в файле
    with open('state.json', 'w') as file:
        json.dump(state, file)

    return {"status": "success"}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
