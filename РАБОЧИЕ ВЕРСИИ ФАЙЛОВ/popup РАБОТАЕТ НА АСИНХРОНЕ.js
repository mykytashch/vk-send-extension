document.addEventListener("DOMContentLoaded", function () {
  let paused = false;
  let messages = [];
  let conversation = {
    messages: []
  };

  async function init() {
    try {
      const response = await fetch("http://localhost:5000/get_message");
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

  document.getElementById("pressEnterButton").addEventListener("click", async function () {
    const tab = await getActiveTab();
    const code = `
      var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      document.querySelector(".im_editable").dispatchEvent(event);
    `;
    await executeScript(tab.id, code);
  });

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
    } else {
      console.log("All messages sent");
      // Сохраняем переписку в JSON-файл
      chrome.runtime.sendMessage({ action: "saveConversation", conversation: conversation });
    }
  }

  sendMessage();

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

  let observer = new MutationObserver(async function (mutations) {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          let messageNode = node.querySelector(".im-mess--text.wall_module._im_log_body");
          if (messageNode) {
            let userMessage = messageNode.innerText;
            if (userMessage) {
              observer.disconnect();

              // Определяем отправителя сообщения
              let sender = 'me';
              if (node.classList.contains("im-mess-stack--message-in")) {
                sender = 'other';
              }

              conversation.messages.push({
                message: userMessage,
                type: "incoming",
                sender: sender
              });

              try {
                await storeResponse({
                  message: userMessage,
                  type: "incoming",
                  sender: sender,
                });
                const { currentMessageIndex = 0 } = await getStorage("currentMessageIndex");
                await setStorage({ currentMessageIndex: currentMessageIndex + 1 });
                if (!paused) {
                  await sendMessage();
                }
              } catch (error) {
                console.error(error);
              }

              observer.observe(chatContainer, { childList: true, subtree: true });
              break;
            }
          }
        }
      }
    }
  });

  let chatContainer = document.querySelector(".im-page--chat-body-wrap-inner-2");
  observer.observe(chatContainer, { childList: true, subtree: true });

  // Обработчик события "change" для селектора задержки
  const delaySelect = document.getElementById("delaySelect");
  const selectOptions = delaySelect.nextElementSibling;


  delaySelect.addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    const delay = selectedOption.getAttribute("data-value");
    console.log("Выбрано значение задержки:", delay);
    // Выполните дополнительные действия в зависимости от выбранной задержки
  });
});

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

async function storeResponse(data) {
  const response = await fetch("http://localhost:5000/store_response", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
