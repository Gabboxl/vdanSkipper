const sendMessageId = document.getElementById("sendmessageid");
if (sendMessageId) {
  sendMessageId.onclick = function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function() {
      chrome.tabs.sendMessage(
        1,
        null,
        function() {
          console.log("pulsante clikkato");
          window.close();
        }
      );
    });
  };
}
