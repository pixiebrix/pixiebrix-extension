/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
  isBackground,
  isContentScript,
  isExtensionContext,
} from "webext-detect-page";

/**
 * Accepts 'This is my error' | new Error('This is my error') | Error;
 * The constructor would be used to create a custom error with the default message
 */
type ErrorBaseType = string | Error | (new (message?: string) => Error);
function createError(
  defaultMessage: string,
  error: ErrorBaseType = Error
): Error {
  if (typeof error === "string") {
    return new Error(error);
  }

  if (error instanceof Error) {
    return error;
  }

  // eslint-disable-next-line new-cap -- ctor passed in as argument
  return new error(defaultMessage);
}

const contexts = [
  "extension",
  "background",
  "contentScript",
  "devTools",
] as const;
const contextMap = new Map<typeof contexts[number], () => boolean>([
  ["extension", isExtensionContext],
  ["background", isBackground],
  ["contentScript", isContentScript],
  ["devTools", () => "devtools" in chrome],
]);

/**
 * @example expectContext('extension')
 * @example expectContext('extension', WrongContextError)
 * @example expectContext('extension', 'Wrong context and this is my custom error')
 * @example expectContext('extension', new Error('Wrong context and this is my custom error'))
 */
export function expectContext(
  context: typeof contexts[number],
  error?: ErrorBaseType
): void {
  const isContext = contextMap.get(context);
  if (!isContext) {
    throw new TypeError(`Context "${context}" not found`);
  }

  if (!isContext()) {
    throw createError(
      `This code can only run in the "${context}" context`,
      error
    );
  }
}

/**
 * @example forbidContext('extension')
 * @example forbidContext('extension', WrongContextError)
 * @example forbidContext('extension', 'Wrong context and this is my custom error')
 * @example forbidContext('extension', new Error('Wrong context and this is my custom error'))
 */
export function forbidContext(
  context: typeof contexts[number],
  error?: ErrorBaseType
): void {
  const isContext = contextMap.get(context);
  if (!isContext) {
    throw new TypeError(`Context "${context}" not found`);
  }

  if (isContext()) {
    throw createError(
      `This code cannot run in the "${context}" context`,
      error
    );
  }
}
