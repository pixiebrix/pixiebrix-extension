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

export type EditableTextElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | (HTMLElement & ElementContentEditable);

export function isContentEditable(
  element: EditableTextElement,
): element is HTMLElement & ElementContentEditable {
  return element.isContentEditable;
}

export function isEditable(
  target: KeyboardEvent["target"],
): target is EditableTextElement {
  if (target instanceof HTMLElement) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    );
  }

  return false;
}
