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

/** Loads a script URL via `script` tag. Resolves with `script` tag or throws when it fails. */
export default async function injectScriptTag(
  source: string
): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.addEventListener("error", (event) => {
      // The cause will most likely be `undefined`
      reject(
        new Error(`Script failed loading: ${source}`, { cause: event.error })
      );
    });
    script.addEventListener("load", () => {
      resolve(script);
    });
    (document.head ?? document.documentElement).append(script);
  });
}
