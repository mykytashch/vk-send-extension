document.addEventListener("DOMContentLoaded", function() {
  let paused = false;

  function observeChat() {
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
                    if (!paused) {
                      observeChat(); // Re-observe chat after sending message
                    }
                  })
                  .catch(console.error);
                
                break;
              }
            }
          }
        }
      }
    });

    let chatContainer = document.querySelector(".im-page--chat-body-wrap-inner-2");
    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  observeChat();
});
