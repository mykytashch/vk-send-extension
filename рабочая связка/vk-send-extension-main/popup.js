document.addEventListener("DOMContentLoaded", function() {
  let paused = false;
  let messages = [];

  fetch('http://localhost:5000/get_message')
    .then(response => response.json())
    .then(data => {
      messages = data.messages;
      chrome.storage.local.set({ messages: messages }, function() {});
      chrome.storage.local.set({ currentMessageIndex: 0 }, function() {});
    })
    .catch(console.error);

  document.getElementById("pauseButton").addEventListener("click", function() {
    paused = true;
    console.log("Paused");
  });

  document.getElementById("continueButton").addEventListener("click", function() {
    paused = false;
    console.log("Continuing");
    sendMessage();
  });

  document.getElementById("pressEnterButton").addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
          var event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          document.querySelector(".im_editable").dispatchEvent(event);
        `
      });
    });
  });

  function sendMessage() {
    chrome.storage.local.get(['currentMessageIndex'], function(result) {
      let currentMessageIndex = result.currentMessageIndex || 0;

      if (!paused && currentMessageIndex < messages.length) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          let codeToExecute = `
            document.querySelector(".im_editable").textContent = \`${messages[currentMessageIndex]}\`;
            var sendButtons = document.querySelectorAll(".im-send-btn__icon--send");
            if (sendButtons && sendButtons.length > 0) {
              for (let i = 0; i < sendButtons.length; i++) {
                sendButtons[i].click();
              }
            }

            let observer = new MutationObserver(function(mutations) {
              for (let mutation of mutations) {
                for (let node of mutation.addedNodes) {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    let messageNode = node.querySelector(".im-mess--text.wall_module._im_log_body");
                    if (messageNode) {
                      let userMessage = messageNode.innerText;
                      if (userMessage) {
                        observer.disconnect();

                        fetch('http://localhost:5000/store_response', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            'message': userMessage
                          })
                        })
                          .then(response => {
                            console.log("Response from server:", response);
                            currentMessageIndex++;
                            chrome.storage.local.set({ currentMessageIndex: currentMessageIndex }, function() {
                              if (!paused) {
                                sendMessage();
                              }
                            });
                          })
                          .catch(console.error);
                        
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
          `;

          chrome.tabs.executeScript(tabs[0].id, { code: codeToExecute });
        });
      } else {
        console.log("All messages sent");
      }
    });
  }

  sendMessage();

  document.getElementById("sendRandomButton").addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      let randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      chrome.tabs.executeScript(tabs[0].id, {
        code: `
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
        `
      });
    });
  });
});
