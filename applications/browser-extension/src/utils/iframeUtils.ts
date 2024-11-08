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
 * Returns true if this function is called within an IFrame
 */

export const isLoadedInIframe = (): boolean => {
  // Using a try/catch block because in some cases trying to
  // access window.top from an iframe can result in a SecurityError

  // If updating this method to use the messenger/frameId, remember that frameId === 0 only for the active top-level
  // frame: see https://developer.chrome.com/blog/extension-instantnav
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};
