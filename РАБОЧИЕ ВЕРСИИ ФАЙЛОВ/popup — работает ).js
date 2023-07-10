// Helper Functions
const executeScriptInTab = async (tabId, codeToExecute) => {
  await chrome.tabs.executeScript(tabId, { code: codeToExecute });
};

const getRandomNumber = () => {
  return Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
};

const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs.length > 0) {
    return tabs[0];
  } else {
    throw new Error("No active tab found.");
  }
};

// Event Handlers
const onDomContentLoaded = async () => {
  let paused = false;
  let messages = [];
  let conversation = {
    messages: []
  };

  try {
    const response = await fetch("http://localhost:5000/get_message");
    const data = await response.json();
    messages = data.messages.map((message) => ({
      text: message,
      type: "outgoing",
    }));
    await new Promise((resolve) => chrome.storage.local.set({ messages }, resolve));
    await new Promise((resolve) => chrome.storage.local.set({ currentMessageIndex: 0 }, resolve));
  } catch (error) {
    console.error("An error occurred while fetching messages:", error);
    // Обработка ошибки и отображение сообщения пользователю
  }

  // Load Questions Button
  document.getElementById("loadQuestionsButton").addEventListener("click", async () => {
    try {
      const employeeId = document.getElementById("employeeId").value;
      const response = await fetch(`http://localhost:5000/load_questions?employeeId=${employeeId}`);
      const data = await response.json();
      // Обновление интерфейса приложения соответствующими данными
    } catch (error) {
      console.error("An error occurred while loading questions:", error);
      // Обработка ошибки и отображение сообщения пользователю
    }
  });

  // Delay Select
  const delaySelect = document.getElementById("delaySelect");
  const selectOptions = delaySelect.nextElementSibling;

  delaySelect.addEventListener("click", () => {
    selectOptions.classList.toggle("custom-select-options--open");
  });

  delaySelect.addEventListener("change", () => {
    const selectedOption = delaySelect.options[delaySelect.selectedIndex];
    const delay = selectedOption.getAttribute("data-value");
    console.log("Выбрано значение задержки:", delay);
    // Выполните дополнительные действия в зависимости от выбранной задержки
  });

  // Reset Button
  document.getElementById("resetButton").addEventListener("click", () => {
    // Сброс данных и состояний приложения к начальным значениям
  });

  // Download History Button
  document.getElementById("downloadHistoryButton").addEventListener("click", async () => {
    try {
      const response = await fetch("http://localhost:5000/get_history");
      const data = await response.json();
      // Предоставление возможности пользователю скачать историю в нужном формате
    } catch (error) {
      console.error("An error occurred while downloading history:", error);
      // Обработка ошибки и отображение сообщения пользователю
    }
  });

  const sendMessage = async () => {
    try {
      const { currentMessageIndex } = await new Promise((resolve) =>
        chrome.storage.local.get(["currentMessageIndex"], resolve)
      );
      const currentQuestionNumber = currentMessageIndex + 1;

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
        await executeScriptInTab(tab.id, codeToExecute);
      } else {
        console.log("All messages sent");
        chrome.runtime.sendMessage({ action: "saveConversation", conversation });
      }
    } catch (error) {
      console.error("An error occurred while sending a message:", error);
      // Обработка ошибки и отображение сообщения пользователю
    }
  };

  const sendRandomMessage = async () => {
    try {
      const tab = await getActiveTab
const sendRandomMessage = async () => {
    try {
      const tab = await getActiveTab();
      const randomNumber = getRandomNumber();
      const codeToExecute = `
        const inputField = document.querySelector(".im_editable");
        if (inputField) {
          inputField.textContent = "${randomNumber}";
          const sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
          if (sendButtons && sendButtons.length > 0) {
            sendButtons.forEach((button) => button.click());
          }
        }
      `;
      await executeScriptInTab(tab.id, codeToExecute);
    } catch (error) {
      console.error("An error occurred while sending a random message:", error);
      // Обработка ошибки и отображение сообщения пользователю
    }
  };

  const pressEnterButtonHandler = async () => {
    try {
      const tab = await getActiveTab();
      const codeToExecute = `
        const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        const inputField = document.querySelector(".im_editable");
        if (inputField) {
          inputField.dispatchEvent(event);
        }
      `;
      await executeScriptInTab(tab.id, codeToExecute);
    } catch (error) {
      console.error("An error occurred while pressing Enter:", error);
      // Обработка ошибки и отображение сообщения пользователю
    }
  };

  document.getElementById("continueButton").addEventListener("click", async () => {
    paused = false;
    await sendMessage();
  });

  document.getElementById("sendRandomButton").addEventListener("click", async () => {
    paused = false;
    await sendRandomMessage();
  });

  document.getElementById("pressEnterButton").addEventListener("click", async () => {
    paused = false;
    await pressEnterButtonHandler();
  });

  let observer = new MutationObserver(async (mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        await handleNode(node, observer);
      }
    }
  });

  let chatContainer = document.querySelector(".im-page--chat-body-wrap-inner-2");
  observer.observe(chatContainer, { childList: true, subtree: true });
};

const handleNode = async (node, observer) => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    let messageNode = node.querySelector(".im-mess--text.wall_module._im_log_body");
    if (messageNode) {
      let userMessage = messageNode.innerText;
      if (userMessage) {
        observer.disconnect();

        let sender = "me";
        if (node.classList.contains("im-mess-stack--message-in")) {
          sender = "other";
        }

        conversation.messages.push({
          message: userMessage,
          type: "incoming",
          sender: sender,
        });

        await storeResponse(userMessage, "incoming", sender, observer);
      }
    }
  }
};

const storeResponse = async (message, type, sender, observer) => {
  try {
    const response = await fetch("http://localhost:5000/store_response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        type,
        sender,
      }),
    });

    console.debug("Response from server:", response);
    const { currentMessageIndex } = await new Promise((resolve) =>
      chrome.storage.local.get(["currentMessageIndex"], resolve)
    );
    let currentIndex = currentMessageIndex || 0;
    currentIndex++;
    await new Promise((resolve) =>
      chrome.storage.local.set({ currentMessageIndex: currentIndex }, resolve)
    );

    if (!paused) {
      await sendMessage();
    }
  } catch (error) {
    console.error("An error occurred while storing response:", error);
    // Обработка ошибки и отображение сообщения пользователю
  }

  observer.observe(chatContainer, { childList: true, subtree: true });
};

document.addEventListener("DOMContentLoaded", onDomContentLoaded);
