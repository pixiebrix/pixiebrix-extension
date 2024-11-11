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

import {
  STATE_CHANGE_JS_EVENT_TYPE,
  type StateChangeEventDetail,
} from "@/platform/state/stateTypes";

/**
 * Dispatch a state change event to the document.
 * @see STATE_CHANGE_JS_EVENT_TYPE
 */
export function dispatchStateChangeEvent(
  // For now, leave off the state data because state controller in the content script uses JavaScript/DOM
  // events, which is a public channel (the host site/other extensions can see the event).
  detail: StateChangeEventDetail,
) {
  console.debug("Dispatching statechange", detail);

  document.dispatchEvent(
    new CustomEvent(STATE_CHANGE_JS_EVENT_TYPE, {
      detail,
      bubbles: true,
    }),
  );
}
