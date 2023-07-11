document.addEventListener("DOMContentLoaded", function () {
  // Обработка события клика на кнопку "Отправить случайное сообщение"
  document.getElementById("sendRandomButton").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
      writeToConversationFile(randomNumber); // Сохраняем случайное сообщение
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          var inputField = document.querySelector(".im_editable");
          if (inputField) {
            inputField.innerHTML = "${randomNumber}";
            var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
            inputField.dispatchEvent(event);
          }
        `,
      });
    });
  });

  // Обработка новых сообщений
  setInterval(handleNewMessages, 1000); // Проверка новых сообщений каждую секунду

  // Обработка события клика на кнопку экспорта
  document.getElementById("exportBtn").addEventListener("click", function () {
    chrome.storage.local.get("conversation", function (result) {
      const conversation = result.conversation || [];

      if (conversation.length > 0) {
        const conversationText = conversation.join("\n");
        const blob = new Blob([conversationText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
          url: url,
          filename: "conversation.txt",
        });
      } else {
        console.log("No conversation messages to export.");
      }
    });
  });
});

// Функция для записи сообщения в файл
function writeToConversationFile(message) {
  chrome.storage.local.get("conversation", function (result) {
    let conversation = result.conversation || [];
    conversation.push(message);
    chrome.storage.local.set({ conversation: conversation }, function () {
      console.log("Message saved:", message);
    });
  });
}

// Функция для обработки новых сообщений
function handleNewMessages() {
  const messageElements = document.querySelectorAll(".im-mess--text.wall_module._im_log_body");

  // Проверка, есть ли новые сообщения
  if (messageElements.length > 0) {
    for (let i = 0; i < messageElements.length; i++) {
      const newMessage = messageElements[i].innerText;
      writeToConversationFile(newMessage);
    }
  }
}
