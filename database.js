chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "saveConversation") {
    let conversation = request.conversation;
    let data = JSON.stringify(conversation, null, 2);
    let blob = new Blob([data], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: "conversation.json",
    });
  }
});
