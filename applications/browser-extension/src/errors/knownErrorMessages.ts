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

/**
 * @file Well-known error messages from the Chrome runtime and vendor libraries.
 */

// From "webext-messenger". Cannot import because the webextension polyfill can only run in an extension context
// TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/3641
export const ERROR_TARGET_CLOSED_EARLY =
  "The target was closed before receiving a response";

export const ERROR_TAB_DOES_NOT_EXIST = "The tab doesn't exist";

export const JQUERY_INVALID_SELECTOR_ERROR =
  "Syntax error, unrecognized expression: ";

/**
 * Some APIs like runtime.sendMessage() and storage.get() will throw this error
 * when the background page has been reloaded
 */
export const CONTEXT_INVALIDATED_ERROR = "Extension context invalidated.";
