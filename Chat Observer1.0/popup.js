// Обработчик события, который будет срабатывать после того как загрузится весь DOM
document.addEventListener("DOMContentLoaded", function () {
  // Создаем переменную, которая будет хранить все сообщения в памяти
  let conversation = [];

  // Обработчик события для кнопки "sendRandomButton", который сработает при клике на кнопку
  document.getElementById("sendRandomButton").addEventListener("click", function () {
    // Запрашиваем активную вкладку в текущем окне
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // Генерируем случайное число, приводим его к строке и дополняем нулями до длины 10 символов
      let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");

      // Добавляем сгенерированное число в массив сообщений и сохраняем массив в хранилище
      conversation.push(randomNumber);
      chrome.storage.local.set({ conversation: conversation });

      // Выполняем скрипт на текущей вкладке, который вставляет случайное число в поле ввода и имитирует нажатие клавиши Enter
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

  // Обработчик события для кнопки "exportBtn", который сработает при клике на кнопку
  document.getElementById("exportBtn").addEventListener("click", function () {
    // Если в массиве есть сообщения
    if (conversation.length > 0) {
      // Объединяем все сообщения в одну строку, разделяя их переносами строки
      const conversationText = conversation.join("\n");

      // Создаем Blob из нашей строки, это необходимо для создания URL, который можно загрузить
      const blob = new Blob([conversationText], { type: "text/plain" });

      // Создаем URL для нашего Blob
      const url = URL.createObjectURL(blob);

      // Инициируем загрузку файла с нашими сообщениями
      chrome.downloads.download({
        url: url,
        filename: "conversation.txt",
      });
    } else {
      console.log("No conversation messages to export.");
    }
  });

  // Получаем из хранилища все сообщения и сохраняем их в нашу переменную conversation
  chrome.storage.local.get("conversation", function (result) {
    conversation = result.conversation || [];
  });

  // Очищаем историю сообщений в хранилище при загрузке страницы
  chrome.storage.local.set({ conversation: [] });
});
