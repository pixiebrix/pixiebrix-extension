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

import browser from "webextension-polyfill";
import { Primitive } from "type-fest";
import { compact, includes, isEmpty, mapValues, pickBy } from "lodash";
import { Target } from "@/types";

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

function normalize(value: Primitive): string {
  return value.toString().toLowerCase();
}

/**
 * Search data for query, matching both keys and values.
 * @see normalize
 */
export function searchData(query: string, data: unknown): unknown {
  const normalizedQuery = normalize(query);
  if (data == null) {
    return null;
  }

  if (typeof data === "object") {
    const values = mapValues(data, (value, key) =>
      includes(normalize(key), normalizedQuery)
        ? value
        : searchData(query, value)
    );
    return pickBy(values, (value, key) => {
      const keyMatch = includes(normalize(key), normalizedQuery);
      const valueMatch =
        typeof value === "object" || Array.isArray(value)
          ? !isEmpty(value)
          : value != null;
      return keyMatch || valueMatch;
    });
  }

  if (Array.isArray(data)) {
    return compact(data.map((d) => searchData(query, d)));
  }

  return includes(normalize(data as Primitive), normalizedQuery)
    ? data
    : undefined;
}

/**
 * Message target for the tab being inspected by the devtools.
 *
 * The Page Editor only supports editing the top-level frame.
 */
export const thisTab: Target = {
  // This code might end up (unused) in non-dev bundles, so use `?.` to avoid errors from undefined values
  tabId: globalThis.chrome?.devtools?.inspectedWindow?.tabId ?? 0,
  // The top-level frame
  frameId: 0,
};
