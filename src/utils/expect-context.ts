/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { isBackgroundPage, isContentScript } from "webext-detect-page";

/**
 * Accepts 'This is my error' | new Error('This is my error') | Error;
 * The constructor would be used to create a custom error with the defalt message
 */
type ErrorBaseType = string | Error | { new (message?: string): Error };
function createError(
  defaultMessage: string,
  error: ErrorBaseType = Error
): Error {
  if (typeof error === "string") {
    // eslint-disable-next-line unicorn/prefer-type-error
    return new Error(error);
  }

  if (error instanceof Error) {
    return error;
  }

  return new error(defaultMessage);
}

/**
 * @example expectBackgroundPage()
 * @example expectBackgroundPage(WrongContextError)
 * @example expectBackgroundPage('Wrong context and this is my custom error')
 * @example expectBackgroundPage(new Error('Wrong context and this is my custom error'))
 */
export function expectBackgroundPage(error?: ErrorBaseType): void {
  if (!isBackgroundPage()) {
    throw createError(`This code can only run in the background page`, error);
  }
}

/**
 * @example expectContentScript()
 * @example expectContentScript(WrongContextError)
 * @example expectContentScript('Wrong context and this is my custom error')
 * @example expectContentScript(new Error('Wrong context and this is my custom error'))
 */
export function expectContentScript(error?: ErrorBaseType): void {
  if (!isContentScript()) {
    throw createError(`This code can only run in the content script`, error);
  }
}

/**
 * @example expectBackgroundPage()
 * @example expectBackgroundPage(WrongContextError)
 * @example expectBackgroundPage('Wrong context and this is my custom error')
 * @example expectBackgroundPage(new Error('Wrong context and this is my custom error'))
 */
export function forbidBackgroundPage(error?: ErrorBaseType): void {
  if (isBackgroundPage()) {
    throw createError(`This code cannot run in the background page`, error);
  }
}

/**
 * @example forbidContentScript()
 * @example forbidContentScript(WrongContextError)
 * @example forbidContentScript('Wrong context and this is my custom error')
 * @example forbidContentScript(new Error('Wrong context and this is my custom error'))
 */
export function forbidContentScript(error?: ErrorBaseType): void {
  if (isContentScript()) {
    throw createError(`This code cannot run in the content script`, error);
  }
}
