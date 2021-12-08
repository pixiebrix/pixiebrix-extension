if (process.env.ENVIRONMENT === "development") {
  // Enables highlighting/prettifying
  const html = ([x]) => x;

  if (localStorage.getItem("dev:dark-mode")) {
    document.head.insertAdjacentHTML(
      "beforeend",
      html`
        <style id="pb-dark-mode">
          @media (prefers-color-scheme: dark) {
            html {
              background: white;
              filter: invert(1) hue-rotate(180deg) contrast(0.8);
            }
          }
        </style>
      `
    );
  }

  window.pbToggleDark = () => {
    if (localStorage.getItem("dev:dark-mode")) {
      localStorage.removeItem("dev:dark-mode");
    } else {
      localStorage.setItem("dev:dark-mode", "yes");
    }

    location.reload();
  };
}
