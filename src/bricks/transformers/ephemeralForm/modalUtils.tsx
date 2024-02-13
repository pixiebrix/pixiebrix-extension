import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";
import EphemeralForm from "@/bricks/transformers/ephemeralForm/EphemeralForm";
import { type UUID } from "@/types/stringTypes";
import { type Target } from "@/types/messengerTypes";
import { Stylesheets } from "@/components/Stylesheets";
import bootstrap from "@/vendors/bootstrapWithoutRem.css?loadAsUrl";

export function showModal({
  url,
  controller,
  onOutsideClick,
  opener,
  nonce,
}: {
  url?: URL;
  opener?: Target;
  nonce?: UUID;
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
    <Stylesheets href={bootstrap}>
      <dialog
        ref={(dialog) => {
          if (!dialog) {
            return;
          }

          dialog.showModal();
          // No types support for "onClose" attribute
          dialog.addEventListener(
            "close",
            () => {
              controller.abort();
            },
            { once: true },
          );

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
        {nonce && opener ? (
          <EphemeralForm nonce={nonce} opener={opener} />
        ) : (
          <iframe
            src={url.href}
            title="Modal content"
            style={{
              border: "0",
              flexGrow: 1, // Fit dialog
              colorScheme: "normal", // Match parent color scheme #1650
            }}
          />
        )}
      </dialog>
    </Stylesheets>,
    shadowRoot,
  );

  controller.signal.addEventListener("abort", () => {
    unmountComponentAtNode(container);
    style.remove();
    container.remove();
  });
}
