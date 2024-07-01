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

import { type ContextName } from "webext-detect";

let _context: ContextName = "extension";

export function TEST_setContext(context: ContextName) {
  _context = context;
}

// Files in __mocks__ cannot be imported directly
// https://github.com/jest-community/eslint-plugin-jest/blob/v27.9.0/docs/rules/no-mocks-import.md
// ... so this exposes the type for the test-only export:
// Example: import { TEST_setContext } from "webext-detect";
declare module "webext-detect" {
  export function TEST_setContext(context: ContextName): boolean;
}

export function isChrome() {
  return true;
}

export function isExtensionContext() {
  return _context !== "web";
}

export function isOptionsPage() {
  return _context === "options";
}

export function isBackground() {
  return _context === "background";
}

export function isBackgroundPage() {
  return _context === "background";
}

export function isWeb() {
  return _context === "web";
}

export function isContentScript() {
  return _context === "contentScript";
}

export function isSidePanel() {
  return _context === "sidePanel";
}

export function getContextName(): ContextName {
  return _context;
}
