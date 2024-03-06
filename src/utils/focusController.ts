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

import { uuidv4 } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";

const FOCUS_CONTROLLER_UUID_SYMBOL = Symbol.for("focus-controller-uuid");

declare global {
  interface Window {
    [FOCUS_CONTROLLER_UUID_SYMBOL]?: UUID;
  }
}

class FocusController {
  /**
   * The last saved focused element
   * @private
   */
  private focusedElement: HTMLElement | undefined;

  /**
   * Nonce to detect multiple imports of focusController
   * @private
   */
  private readonly nonce = uuidv4();

  constructor() {
    // eslint-disable-next-line security/detect-object-injection -- symbol
    if (window[FOCUS_CONTROLLER_UUID_SYMBOL]) {
      console.warn(
        // eslint-disable-next-line security/detect-object-injection -- symbol
        `focusController(${this.nonce}): ${window[FOCUS_CONTROLLER_UUID_SYMBOL]} already added to window`,
      );
    } else {
      // eslint-disable-next-line security/detect-object-injection -- symbol
      window[FOCUS_CONTROLLER_UUID_SYMBOL] = this.nonce;
    }
  }

  /**
   * Saves the focus of the current focused element so that it can be restored later
   * @note This doesn't behave as you'd expect across iframes
   */
  save(): void {
    // Only HTMLElements can have their focus restored, but we're currently ignoring this distinction
    const active = document.activeElement as HTMLElement;

    if (this.focusedElement != null && this.focusedElement !== active) {
      console.warn(
        `focusController(${this.nonce}): the previously-saved focus is being overridden`,
        {
          previous: this.focusedElement,
          active,
        },
      );
    }

    this.focusedElement = active;
  }

  /**
   * Restores the focus to the last saved item, if it hasn't already been restored
   * @note This doesn't behave as you'd expect across iframes
   */
  restore(): void {
    // `focusedElement === body`: This restores its focus. `body.focus()` doesn't do anything
    (document.activeElement as HTMLElement)?.blur?.();

    // `focusedElement === HTMLElement`: Restore focus if it's an HTMLElement, otherwise silently ignore it
    this.focusedElement?.focus?.();

    this.focusedElement = undefined;
  }

  /** Clear saved value without restoring focus */
  clear(): void {
    this.focusedElement = undefined;
  }

  /**
   * Gets the last saved item or the current active item, if there is no saved item
   */
  get(): HTMLElement {
    return this.focusedElement ?? (document.activeElement as HTMLElement);
  }
}

/**
 * Singleton instance of the focus controller
 */
const focusController = new FocusController();

export default focusController;
