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

import { isLoadedInIframe } from "@/utils/iframeUtils";

declare global {
  // eslint-disable-next-line no-var, @shopify/prefer-module-scope-constants -- It must be a var for types to work
  var PB_FOCUS_CONTROLLER: boolean;
}

let focusedElement: HTMLElement | undefined;

if (globalThis.PB_FOCUS_CONTROLLER) {
  console.error(
    "focusController: there should only be one focusController instance per window",
  );
} else {
  globalThis.PB_FOCUS_CONTROLLER = true;
}

const focusController = {
  /**
   * Saves the focus of the current focused element so that it can be restored later
   * @note This doesn't behave as you'd expect across iframes
   */
  save(): void {
    // Only HTMLElements can have their focus restored, but we're currently ignoring this distinction
    const active = document.activeElement as HTMLElement;

    if (focusedElement != null && focusedElement !== active) {
      console.warn(
        "focusController: the previously-saved focus is being overridden",
        {
          previous: focusedElement,
          active,
        },
      );
    }

    focusedElement = active;
  },

  /**
   * Restores the focus to the last saved item, if it hasn't already been restored
   * @note This doesn't behave as you'd expect across iframes
   */
  restore(): void {
    // `focusedElement === body`: This restores its focus. `body.focus()` doesn't do anything
    (document.activeElement as HTMLElement)?.blur?.();

    // `focusedElement === HTMLElement`: Restore focus if it's an HTMLElement, otherwise silently ignore it
    focusedElement?.focus?.();

    focusedElement = undefined;
  },

  /** Clear saved value without restoring focus */
  clear(): void {
    focusedElement = undefined;
  },

  /**
   * Gets the last saved item or the current active item, if there is no saved item
   */
  get(): HTMLElement {
    return focusedElement ?? (document.activeElement as HTMLElement);
  },
} as const;

export default focusController;
