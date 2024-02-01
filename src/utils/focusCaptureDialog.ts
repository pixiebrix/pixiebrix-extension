/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { memoizeUntilSettled } from "./promiseUtils";

async function rawFocusCaptureDialog(message: string): Promise<void> {
  const dialog = document.createElement("dialog");
  dialog.className = "pixiebrix-dialog";
  dialog.textContent = message;

  const button = document.createElement("button");
  button.autofocus = true;
  button.textContent = "OK";

  dialog.append(button);
  document.body.append(dialog);

  dialog.showModal();

  await Promise.race([
    oneEvent(button, "click"),
    oneEvent(dialog, "cancel"),
    onContextInvalidated.promise,
  ]);
  dialog.remove();
}

/** The style for this component is currently in `contentScript.scss */
export const focusCaptureDialog = memoizeUntilSettled(rawFocusCaptureDialog, {
  // We only need one focus event, so multiple requests will just wait for the
  // first request to resolve, even if the message is different. Without a static `cacheKey`,
  // we'd still get one dialog per message.
  // If problematic, it's up to the caller to avoid queueing multiple requests.
  cacheKey: () => "focusCaptureDialog",
});
