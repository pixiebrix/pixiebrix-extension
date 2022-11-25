document.documentElement.insertAdjacentHTML("beforeend", "<p>JS loaded");
document.documentElement.insertAdjacentHTML(
  "beforeend",
  "<p>typeof chrome.runtime API: " + typeof globalThis.runtime
);
eval("document.documentElement.insertAdjacentHTML('beforeend', '<p>eval run')");
