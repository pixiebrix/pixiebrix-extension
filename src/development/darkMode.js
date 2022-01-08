if (process.env.ENVIRONMENT === "development") {
  // Enables highlighting/prettifying
  const html = ([x]) => x;

  document.head.insertAdjacentHTML(
    "beforeend",
    html`
      <style id="pb-dark-mode" media="none">
        @media (prefers-color-scheme: dark) {
          html {
            background: white;
            filter: invert(1) hue-rotate(180deg) contrast(0.8);
          }
        }
      </style>
    `
  );

  const update = (set = localStorage.getItem("dev:dark-mode")) => {
    document.querySelector("#pb-dark-mode").media = set ? "all" : "none";
  };

  update();

  window.pbToggleDark = () => {
    if (localStorage.getItem("dev:dark-mode")) {
      localStorage.removeItem("dev:dark-mode");
      update(false);
    } else {
      localStorage.setItem("dev:dark-mode", "yes");
      update(true);
    }
  };
}
