import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";
import { mergeSignals } from "abort-utils";
import { onContextInvalidated } from "webext-events";

// This cannot be moved to globals.d.ts because it's a module augmentation
// https://stackoverflow.com/a/42085876/288906
declare module "react" {
  interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
    onClose?: ReactEventHandler<T> | undefined;
  }
}

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
      onClose={() => {
        controller.abort();
      }}
      ref={(dialog) => {
        if (!dialog) {
          return;
        }

        dialog.showModal();

        // This doesn't work below the modal, because the Shadow Root extends
        dialog.addEventListener("click", () => {
          // Normally you'd check for event.target = dialog. But given the shadow root, the target ends up being
          // somewhere on the page, not the dialog itself
          onOutsideClick?.();
        });
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
    shadowRoot,
  );

  mergeSignals(controller, onContextInvalidated.signal).addEventListener(
    "abort",
    () => {
      unmountComponentAtNode(container);
      style.remove();
      container.remove();
    },
  );
}
