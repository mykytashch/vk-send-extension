// Функция для отправки сообщения фоновому скрипту
function sendMessageToBackgroundScript(message) {
  chrome.runtime.sendMessage({ message: message });
}

// Обработка события получения нового сообщения
document.addEventListener("DOMNodeInserted", function (event) {
  const messageElement = event.target.querySelector(".im-mess--text.wall_module._im_log_body");

  if (messageElement) {
    const message = messageElement.innerText;
    sendMessageToBackgroundScript(message);
  }
});
