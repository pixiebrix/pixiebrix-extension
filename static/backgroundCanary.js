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
 * @file This is a standalone background entry point that must run independently of the rest of extension.
 * It can be used to detect and handle build errors and background loading errors.
 */

if (chrome.runtime.getManifest === undefined) {
  try {
    console.log("Unregistering orphan background worker");
    globalThis.registration.unregister(); // Try to automatically unregister
  } catch {
    throw new Error(
      "Chrome bug: The extension was loaded as MV2, but Chrome is still running the worker. Unregister the loader from chrome://serviceworker-internals/",
    );
  }
}
