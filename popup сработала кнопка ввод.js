document.addEventListener("DOMContentLoaded", function() {
  let paused = false;
  let messages = [];

  // Загрузка сообщений с сервера при старте расширения
  fetch('http://localhost:5000/get_message')
    .then(response => response.json())
    .then(data => {
      messages = data.message;
      chrome.storage.local.set({messages: messages}, function() {});
    })
    .catch(console.error);

  document.getElementById("pauseButton").addEventListener("click", function() {
    paused = true;
  });

  document.getElementById("continueButton").addEventListener("click", function() {
    paused = false;
    sendMessage();
  });

  // Событие нажатия на кнопку "sendButton"
  document.getElementById("sendButton").addEventListener("click", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          var sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
          if (sendButtons) {
            for (let i = 0; i < sendButtons.length; i++) {
              sendButtons[i].click();
            }
          }
        `
      });
    });
  });

  function sendMessage() {
    chrome.storage.local.get(['currentMessageIndex'], function(result) {
      let currentMessageIndex = result.currentMessageIndex || 0;

      if (!paused && currentMessageIndex < messages.length) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          let codeToExecute = `
            document.querySelector("#im_editable0").innerHTML = "` + messages[currentMessageIndex] + `";
            var sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
            if (sendButtons) {
              for (let i = 0; i < sendButtons.length; i++) {
                sendButtons[i].click();
              }
            }
            
            setTimeout(function() {
              let userMessage = document.querySelector(".im-mess--text").innerText;

              fetch('http://localhost:5000/store_response', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  'user_message': userMessage
                })
              }).catch(console.error);
            }, 3000);
          `;
          
          chrome.tabs.executeScript(tabs[0].id, {code: codeToExecute});

          currentMessageIndex++;
          chrome.storage.local.set({currentMessageIndex: currentMessageIndex}, function() {
            if (!paused) {
              sendMessage();
            }
          });
        });
      }
    });
  }

  sendMessage();
});
