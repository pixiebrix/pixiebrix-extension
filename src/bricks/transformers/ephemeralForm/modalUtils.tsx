import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";

export function showModal({
  url,
  controller,
  onOutsideClick,
}: {
  url: URL;
  controller: AbortController;
  onOutsideClick?: () => void;
}): void {
  // Using `<style>` will avoid overriding the site’s inline styles
  const style = document.createElement("style");

  const scrollableRoot =
    window.getComputedStyle(document.body).overflowY === "scroll"
      ? "body"
      : "html";
  style.textContent += `${scrollableRoot} {overflow: hidden !important}`; // Disable scrollbar

  // Preserve space initially taken by scrollbar
  style.textContent += `html {padding-inline-end: ${scrollbarWidth()}px  !important}`;

  const container = document.createElement("div");
  const shadowRoot = container.attachShadow({ mode: "closed" });
  document.body.append(container, style);
  render(
    <dialog
      ref={(dialog) => {
        dialog.showModal();
        // No types support for "onClose" attribute
        dialog.addEventListener(
          "close",
          () => {
            controller.abort();
          },
          { once: true }
        );
      }}
      style={{
        border: 0,
        width: "500px",
        height: "100vh", // TODO: Replace with frame auto-sizer via messaging
        display: "flex", // Fit iframe inside
        background: "none",
      }}
    >
      <iframe
        src={url.href}
        title="Modal content"
        style={{
          border: "0",
          flexGrow: 1, // Fit dialog
          colorScheme: "normal", // Match parent color scheme #1650
        }}
      />
    </dialog>,
    shadowRoot
  );

  const dialog = shadowRoot.querySelector("dialog");

  // This doesn't work below the modal, because the Shadow Root extends
  dialog.addEventListener("click", () => {
    // Normally you'd check for event.target = dialog. But given the shadow root, the target ends up being
    // somewhere on the page, not the dialog itself
    onOutsideClick?.();
  });

  controller.signal.addEventListener("abort", () => {
    unmountComponentAtNode(container);
    style.remove();
    container.remove();
  });
}
