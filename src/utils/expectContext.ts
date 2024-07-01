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
  isBackground,
  isContentScript,
  isExtensionContext,
  isWebPage,
} from "webext-detect";

/**
 * Whether the current context is the top frame of the browser sidebar.
 *
 * Note: Returns false for nested frames in the MV3 sidebar, since generally their path won't match.
 */
export function isBrowserSidebarTopFrame(): boolean {
  return isExtensionContext() && location.pathname === "/sidebar.html";
}

/**
 * Whether the current context is the top frame of the page editor.
 */
export function isPageEditorTopFrame(): boolean {
  return location.pathname === "/pageEditor.html";
}

/**
 * Accepts 'This is my error' | new Error('This is my error') | Error;
 * The constructor would be used to create a custom error with the default message
 */
type ErrorBaseType = string | Error | (new (message?: string) => Error);
function createError(
  defaultMessage: string,
  errorOrCtor: ErrorBaseType = Error,
): Error {
  if (typeof errorOrCtor === "string") {
    return new Error(errorOrCtor);
  }

  if (errorOrCtor instanceof Error) {
    return errorOrCtor;
  }

  // eslint-disable-next-line new-cap -- variable can be an value or constructor
  return new errorOrCtor(defaultMessage);
}

// eslint-disable-next-line local-rules/persistBackgroundData -- Functions
const contextMap = {
  web: isWebPage,
  extension: isExtensionContext,
  background: isBackground,
  pageEditor: isPageEditorTopFrame,
  contentScript: isContentScript,
  sidebar: isBrowserSidebarTopFrame,
} as const;

/**
 * Throws an error if the current context is not the expected one.
 *
 * For cross-platform capabilities, use assertPlatformCapability
 *
 * @example expectContext('extension')
 * @example expectContext('extension', WrongContextError)
 * @example expectContext('extension', 'Wrong context and this is my custom error')
 * @example expectContext('extension', new Error('Wrong context and this is my custom error'))
 * @see assertPlatformCapability
 */
export function expectContext(
  context: keyof typeof contextMap,
  error?: ErrorBaseType,
): void {
  // eslint-disable-next-line security/detect-object-injection -- type-checked
  const isContext = contextMap[context];
  if (!isContext) {
    throw new TypeError(`Context "${context}" not found`);
  }

  if (!isContext()) {
    throw createError(
      `This code can only run in the "${context}" context`,
      error,
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
  context: keyof typeof contextMap,
  error?: ErrorBaseType,
): void {
  const isContext = contextMap[context];
  if (!isContext) {
    throw new TypeError(`Context "${context}" not found`);
  }

  if (isContext()) {
    throw createError(
      `This code cannot run in the "${context}" context`,
      error,
    );
  }
}
