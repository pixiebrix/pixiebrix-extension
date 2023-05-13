/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

type ContextName =
  | "contentScript"
  | "background"
  | "options"
  | "devToolsPage"
  | "extension"
  | "web";

let _context: ContextName = "extension";

export function setContext(context: ContextName) {
  _context = context;
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

export function isDevToolsPage() {
  return _context === "devToolsPage";
}

export function isBackground() {
  return _context === "background";
}

export function isWeb() {
  return _context === "web";
}

export function getContextName(): ContextName {
  return _context;
}
