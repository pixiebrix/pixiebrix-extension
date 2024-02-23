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

let focusedElement: HTMLElement | undefined;

const focusController = {
  /**
   * Saves the focus of the current focused element so that it can be restored later
   * @note This doesn't behave as you'd expect across iframes
   */
  save(): void {
    if (focusedElement) {
      console.warn("The previously-saved focus is being overridden", {
        focusedElement,
      });
    }

    // Only HTMLElements can't have their focus restored, but we're currently ignoring this distinciton
    focusedElement = document.activeElement as HTMLElement;
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
  get(): HTMLElement {
    return focusedElement ?? (document.activeElement as HTMLElement);
  },
} as const;

export default focusController;
