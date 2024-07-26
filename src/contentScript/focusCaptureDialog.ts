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

import oneEvent from "one-event";
import { onContextInvalidated } from "webext-events";
import {
  type AbortSignalAsOptions,
  memoizeUntilSettled,
} from "@/utils/promiseUtils";
import cssText from "@/contentScript/focusCaptureDialog.scss?loadAsText";

type FocusCaptureDialogOptions = {
  message: string;
  buttonText?: string;
} & AbortSignalAsOptions;

async function rawFocusCaptureDialog({
  message,
  buttonText = "OK",
  signal,
}: FocusCaptureDialogOptions): Promise<void> {
  // Dialog does not support shadow DOM, so we need to create a container
  const container = document.createElement("div");
  container.className = "pixiebrix-dialog-container";
  container.setAttribute("style", "all: initial;");
  container.dataset.testid = "pixiebrix-dialog-container";

  const style = document.createElement("style");
  style.textContent = cssText;

  const shadow = container.attachShadow({ mode: "open" });
  shadow.append(style);

  const dialog = document.createElement("dialog");
  dialog.className = "pixiebrix-dialog";

  const text = document.createElement("span");
  text.textContent = message;
  dialog.append(text);

  const button = document.createElement("button");
  button.autofocus = true;
  button.textContent = buttonText;
  dialog.append(button);

  shadow.append(dialog);
  document.body.append(container);

  dialog.showModal();

  const anyPromiseWillCloseTheDialog = [
    oneEvent(button, "mousedown"),
    oneEvent(button, "click"),
    oneEvent(dialog, "cancel"),
    onContextInvalidated.promise,
  ];

  if (signal) {
    anyPromiseWillCloseTheDialog.push(oneEvent(signal, "abort"));
  }

  await Promise.race(anyPromiseWillCloseTheDialog);

  container.remove();
}

export const focusCaptureDialog = memoizeUntilSettled(rawFocusCaptureDialog, {
  // We only need one focus event, so multiple requests will just wait for the
  // first request to resolve, even if the message is different. Without a static `cacheKey`,
  // we'd still get one dialog per message.
  // If problematic, it's up to the caller to avoid queueing multiple requests.
  cacheKey: () => "focusCaptureDialog",
});
