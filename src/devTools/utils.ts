/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser } from "webextension-polyfill-ts";

function printf(string: string, arguments_: string[]): string {
  // eslint-disable-next-line unicorn/no-array-reduce -- Short and already described by "printf"
  return arguments_.reduce(
    (message, part) => message.replace("%s", part),
    string
  );
}

export async function getCurrentURL(): Promise<string> {
  if (!browser.devtools) {
    throw new Error("getCurrentURL can only run in the developer tools");
  }

  const [response, error] = await browser.devtools.inspectedWindow.eval(
    "location.href"
  );

  // Handle Dev Tools API error response
  // https://developer.chrome.com/docs/extensions/reference/devtools_inspectedWindow/#method-eval
  // https://github.com/pixiebrix/pixiebrix-extension/pull/999#discussion_r684370643
  if (!response && error?.isError) {
    throw new Error(printf(error.description, error.details));
  }

  return response;
}
