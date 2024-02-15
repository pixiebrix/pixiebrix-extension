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

import { SessionValue } from "@/mv3/SessionStorage";
import { type MessengerMeta, type Sender } from "webext-messenger";
import { expectContext, forbidContext } from "@/utils/expectContext";
import { once } from "lodash";
import { onContextInvalidated } from "webext-events";
import { documentReceivedFocus } from "@/background/messenger/strict/api";

export const lastFocusedTarget = new SessionValue<Sender | null>(
  "lastFocusedTarget",
  import.meta.url,
);

export function rememberFocus(this: MessengerMeta): void {
  expectContext("background");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- There's always at least one
  void lastFocusedTarget.set(this.trace[0]!);
}

/** @warning Only call this function in contexts that registered the `WRITE_TO_CLIPBOARD` handler */
export const markContextAsFocusableByUser = once((): void => {
  forbidContext("background");
  window.addEventListener(
    "focus",
    () => {
      documentReceivedFocus();
    },
    { signal: onContextInvalidated.signal },
  );
});
