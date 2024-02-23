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

import React from "react";
import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { render, unmountComponentAtNode } from "react-dom";
import { mergeSignals } from "abort-utils";
import { onContextInvalidated } from "webext-events";
import { expectContext } from "@/utils/expectContext";

// This cannot be moved to globals.d.ts because it's a module augmentation
// https://stackoverflow.com/a/42085876/288906
declare module "react" {
  interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
    onClose?: ReactEventHandler<T> | undefined;
  }
}
/**
 * Show a modal with the given URL in the host page
 * @param url the URL to show
 * @param controller AbortController to cancel the modal
 * @param onOutsideClick callback to call when the user clicks outside the modal
 */
export function showModal({
  url,
  controller,
  onOutsideClick,
}: {
  url: URL;
  controller: AbortController;
  onOutsideClick?: () => void;
}): void {
  // In React apps, should use React modal component
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
    // TODO: Wrap into separate component and use useScrollLock hook
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
