/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";
import { expectContext } from "@/utils/expectContext";

export function showModal({
  url,
  controller,
  onOutsideClick,
}: {
  url: URL;
  controller: AbortController;
  onOutsideClick?: () => void;
}): void {
  expectContext("contentScript");

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

  controller.signal.addEventListener("abort", () => {
    unmountComponentAtNode(container);
    style.remove();
    container.remove();
  });
}
