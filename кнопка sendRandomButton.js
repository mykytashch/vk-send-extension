Кнопка "Отправить случайное сообщение": Отправляет случайное число

Идентификатор кнопки `sendRandomButton`

document.getElementById("sendRandomButton").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, "0");
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
