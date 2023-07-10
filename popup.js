document.addEventListener("DOMContentLoaded", async function () {
  let paused = false;
  let messages = [];
  let conversation = {
    messages: []
  };

  const ws = new WebSocket('ws://localhost:5000');

  ws.onopen = () => {
    console.log('WebSocket connection established');
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case 'QUESTION':
        handleQuestion(data);
        break;
      case 'END':
        handleEnd(data);
        break;
      default:
        console.error('Unknown message type:', data.type);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };

  async function init() {
    try {
      const response = await fetch("http://localhost:5000/get_message");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      messages = data.messages.map((message) => ({
        text: message,
        type: "outgoing",
      }));
      await setStorage({ messages: messages, currentMessageIndex: 0 });
    } catch (error) {
      console.error(error);
    }
  }

  init();

  document.getElementById("pauseButton").addEventListener("click", function () {
    paused = true;
  });

  document.getElementById("continueButton").addEventListener("click", async function () {
    paused = false;
    await sendMessage();
  });

  document.getElementById("resetButton").addEventListener("click", async function () {
    handleResetClick();
  });

  document.getElementById("loadQuestionsButton").addEventListener("click", async function () {
    handleLoadQuestionsClick();
  });

  document.getElementById("employeeId").addEventListener("change", function () {
    handleEmployeeIdChange();
  });

  document.getElementById("downloadHistoryButton").addEventListener("click", function () {
    handleDownloadHistoryClick();
  });

  document.getElementById("pressEnterButton").addEventListener("click", async function () {
    const tab = await getActiveTab();
    const code = `
      var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      document.querySelector(".im_editable").dispatchEvent(event);
    `;
    await executeScript(tab.id, code);
  });

  document.getElementById("sendRandomButton").addEventListener("click", async function () {
    const tab = await getActiveTab();
    const randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
    const code = `
      var inputField = document.querySelector(".im_editable");
      if (inputField) {
        inputField.innerHTML = "${randomNumber}";
        var sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
        if (sendButtons && sendButtons.length > 0) {
          for (let i = 0; i < sendButtons.length; i++) {
            sendButtons[i].click();
          }
        }
      }
    `;
    await executeScript(tab.id, code);
  });

  // Обработка полученных вопросов
  function handleQuestion(data) {
    const question = {
      text: data.message,
      type: 'incoming',
    };
    messages.push(question);
    conversation.messages.push(question);

    // Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
    updateQuestionInfo();

    // Отправляем ответы на сервер
    storeResponse({ employeeId: data.employeeId, response: '' });
  }

  // Обработка окончания вопросов
  function handleEnd(data) {
    console.log("Вопросы закончились");

    // Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
    updateQuestionInfo();
  }

  // Обработка события сброса
  function handleResetClick() {
    messages = [];
    conversation = {
      messages: []
    };

    // Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
    updateQuestionInfo();
  }

  // Загрузка вопросов
  async function handleLoadQuestionsClick() {
    const employeeId = document.getElementById("employeeId").value;
    ws.send(JSON.stringify({ type: 'LOAD_QUESTIONS', employeeId: employeeId }));
  }

  // Обработка изменения поля ввода "Вопросник №"
  function handleEmployeeIdChange() {
    const employeeId = document.getElementById("employeeId").value;
    ws.send(JSON.stringify({ type: 'CHANGE_EMPLOYEE', employeeId: employeeId }));
  }

  // Загрузка истории переписки
  function handleDownloadHistoryClick() {
    const history = JSON.stringify(conversation);
    const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'conversation.json';
   
link.href = url;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
}

// Обработка изменения задержки
function handleDelayChange() {
const delay = document.getElementById("delaySelect").value;
ws.send(JSON.stringify({ type: 'CHANGE_DELAY', delay: parseInt(delay) }));
}

async function sendMessage() {
const { currentMessageIndex = 0 } = await getStorage("currentMessageIndex");
if (!paused && currentMessageIndex < messages.length) {
  const tab = await getActiveTab();
  const codeToExecute = `
    document.querySelector(".im_editable").textContent = \`${messages[currentMessageIndex].text}\`;
    var sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
    if (sendButtons && sendButtons.length > 0) {
      for (let i = 0; i < sendButtons.length; i++) {
        sendButtons[i].click();
      }
    }
  `;
  await executeScript(tab.id, codeToExecute);

  // Увеличиваем индекс текущего сообщения
  await setStorage({ currentMessageIndex: currentMessageIndex + 1 });

  // Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
  updateQuestionInfo();
} else {
  console.log("All messages sent");
  // Сохраняем переписку в JSON-файл
  chrome.runtime.sendMessage({ action: "saveConversation", conversation: conversation });
}
}

async function storeResponse(data) {
const response = await fetch("http://localhost:5000/store_response", {
method: "POST",
headers: {
"Content-Type": "application/json",
"X-Employee-ID": data.employeeId,
},
body: JSON.stringify(data),
});
return response.json();
}

function updateQuestionInfo() {
// Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
const currentQuestionIndex = messages.length;
const remainingQuestions = messages.length - conversation.messages.length;
// Обновите соответствующие элементы на вашем интерфейсе с информацией о текущем номере вопроса и оставшемся количестве вопросов
console.log("Current Question Index:", currentQuestionIndex);
console.log("Remaining Questions:", remainingQuestions);
}

// Промисы для асинхронных вызовов
function getStorage(keys) {
return new Promise((resolve, reject) => {
chrome.storage.local.get(keys, (result) => {
if (chrome.runtime.lastError) {
reject(chrome.runtime.lastError);
} else {
resolve(result);
}
});
});
}

function setStorage(items) {
return new Promise((resolve, reject) => {
chrome.storage.local.set(items, () => {
if (chrome.runtime.lastError) {
reject(chrome.runtime.lastError);
} else {
resolve();
}
});
});
}

function getActiveTab() {
return new Promise((resolve, reject) => {
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
if (chrome.runtime.lastError) {
reject(chrome.runtime.lastError);
} else {
resolve(tabs[0]);
}
});
});
}

function executeScript(tabId, code) {
return new Promise((resolve, reject) => {
chrome.tabs.executeScript(tabId, { code: code }, (results) => {
if (chrome.runtime.lastError) {
reject(chrome.runtime.lastError);
} else {
resolve(results[0]);
}
});
});
}

sendMessage();
});

// Места, которые нужно доработать
function handleQuestion(data) {
const question = {
text: data.message,
type: 'incoming',
};
messages.push(question);
conversation.messages.push(question);

// Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
updateQuestionInfo();

// Отправляем ответы на сервер
storeResponse({ employeeId: data.employeeId, response: '' });
}

function handleEnd(data) {
console.log("Вопросы закончились");

// Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
updateQuestionInfo();
}

function handleResetClick() {
messages = [];
conversation = {
messages: []
};

// Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
updateQuestionInfo();
}

function handleLoadQuestionsClick() {
const employeeId = document.getElementById("employeeId").value;
ws.send(JSON.stringify({ type: 'LOAD_QUESTIONS', employeeId: employeeId }));
}

function handleEmployeeIdChange() {
const employeeId = document.getElementById("employeeId").value;
ws.send(JSON.stringify({ type: 'CHANGE_EMPLOYEE', employeeId: employeeId }));
}

function handleDownloadHistoryClick() {
const history = JSON.stringify(conversation);
const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.download = 'conversation.json';
link.href = url;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
}

function handleDelayChange() {
const delay = document.getElementById("delaySelect").value;
ws.send(JSON.stringify({ type: 'CHANGE_DELAY', delay: parseInt(delay) }));
}

function updateQuestionInfo() {
// Обновление информации на экране о текущем номере вопроса и оставшемся количестве вопросов
const currentQuestionIndex = messages.length;
const remainingQuestions = messages.length - conversation.messages.length;
// Обновите соответствующие элементы на вашем интерфейсе с информацией о текущем номере вопроса и оставшемся количестве вопросов
console.log("Current Question Index:", currentQuestionIndex);
console.log("Remaining Questions:", remainingQuestions);
}