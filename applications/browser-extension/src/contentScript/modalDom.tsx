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
import { expectContext } from "../utils/expectContext";
import { renderWidget } from "../utils/reactUtils";
import useScrollLock from "../hooks/useScrollLock";
import useAbortSignal from "../hooks/useAbortSignal";

// This cannot be moved to globals.d.ts because it's a module augmentation
// https://stackoverflow.com/a/42085876/288906
declare module "react" {
  interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
    onClose?: ReactEventHandler<T> | undefined;
  }
}

const IframeModal: React.VFC<{
  url: URL;
  controller: AbortController;
  onOutsideClick?: () => void;
}> = ({ url, controller, onOutsideClick }) => {
  const aborted = useAbortSignal(controller.signal);
  useScrollLock(!aborted);

  return aborted ? null : (
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
          all: "initial",
          border: "0",
          flexGrow: 1, // Fit dialog
          colorScheme: "normal", // Match parent color scheme #1650
        }}
      />
    </dialog>
  );
};

/**
 * Show a modal with the given URL in the host page
 * @param url the page to show in the modal
 * @param controller AbortController to cancel the modal
 * @param onOutsideClick callback to call when the user clicks outside the modal
 */
export function showModal(props: {
  url: URL;
  controller: AbortController;
  onOutsideClick?: () => void;
}): void {
  // In React apps, you should use the React modal component
  expectContext("contentScript");

  renderWidget({
    name: "iframe-modal",
    widget: <IframeModal {...props} />,
    signal: props.controller.signal,
  });
}
