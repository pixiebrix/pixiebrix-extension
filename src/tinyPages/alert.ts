// eslint-disable-next-line import/no-unassigned-import -- CSS import
import "webext-base-css";

const container = document.querySelector("main");

try {
  const button = document.createElement("button");
  button.textContent = "Ok";
  button.addEventListener("click", () => {
    window.close();
  });
  container.after(button);

  const message = new URLSearchParams(location.search);
  container.textContent = message.get("message");
  document.title = message.get("title") ?? document.title;
  window.resizeBy(0, document.body.scrollHeight - window.innerHeight);
} catch {
  window.close();
}
