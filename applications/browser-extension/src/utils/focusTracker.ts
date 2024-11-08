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

import { SessionValue } from "../mv3/SessionStorage";
import {
  registerMethods,
  type MessengerMeta,
  type Sender,
} from "webext-messenger";
import { expectContext, forbidContext } from "./expectContext";
import { once } from "lodash";
import { onContextInvalidated } from "webext-events";
import { documentReceivedFocus } from "@/background/messenger/api";
import { nonInteractivelyWriteToClipboard } from "./clipboardUtils";

declare global {
  interface MessengerMethods {
    WRITE_TO_CLIPBOARD: typeof nonInteractivelyWriteToClipboard;
  }
}

export const lastFocusedTarget = new SessionValue<Sender | null>(
  "lastFocusedTarget",
  import.meta.url,
);

export function rememberFocus(this: MessengerMeta): void {
  expectContext("background");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- There's always at least one
  void lastFocusedTarget.set(this.trace[0]!);
}

/**
 * Will send a message to the background worker so that knows which context is currently focused.
 * It also registers the `WRITE_TO_CLIPBOARD` method here so that it's never mistakenly left out.
 * https://github.com/pixiebrix/pixiebrix-extension/pull/7635
 */
export const markDocumentAsFocusableByUser = once((): void => {
  forbidContext("background");
  registerMethods({
    WRITE_TO_CLIPBOARD: nonInteractivelyWriteToClipboard,
  });
  window.addEventListener(
    "focus",
    () => {
      documentReceivedFocus();
    },
    { signal: onContextInvalidated.signal },
  );
});
