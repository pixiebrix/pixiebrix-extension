const tabId = chrome.devtools.inspectedWindow.tabId;
console.log(`Start initializing devtools for tab ${tabId}`);

// https://developer.chrome.com/extensions/devtools_panels#method-create
// https://github.com/facebook/react/blob/master/packages/react-devtools-extensions/src/main.js#L298
chrome.devtools.panels.create(
  "PixieBrix Inspector",
  "",
  "panel.html",
  (extensionPanel) => {
    console.log("Devtools panel created");
  }
);

// Create a connection to the background page
// https://developer.chrome.com/extensions/devtools#detecting-open-close
const backgroundPageConnection = chrome.runtime.connect({
  name: "devtools-page",
});
