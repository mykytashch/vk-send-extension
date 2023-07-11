chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "saveMessage") {
    const message = request.message;

    // Получение текущей истории сообщений из хранилища
    chrome.storage.local.get(["conversation"], function (result) {
      const currentConversation = result.conversation || "";

      // Добавление нового сообщения к истории
      const updatedConversation = currentConversation + message + "\n";

      // Сохранение обновленной истории в хранилище
      chrome.storage.local.set({ conversation: updatedConversation }, function () {
        console.log("Message saved:", message);
      });

      // Отправка сообщения во все активные вкладки
      chrome.tabs.query({}, function (tabs) {
        for (let i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, { action: "newMessage", message: message });
        }
      });
    });
  }
});
