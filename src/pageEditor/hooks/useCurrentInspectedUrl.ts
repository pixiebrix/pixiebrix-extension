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

import { once } from "lodash";
import { useEffect, useState } from "react";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { type WebNavigation } from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import {
  getCurrentInspectedURL,
  isCurrentTopFrame,
} from "@/pageEditor/context/connection";
import type { Nullishable } from "@/utils/nullishUtils";

let tabUrl: Nullishable<string>;

const urlChanges = new SimpleEventTarget<string>();

async function onNavigation(
  target: WebNavigation.OnCommittedDetailsType,
): Promise<void> {
  if (isCurrentTopFrame(target)) {
    tabUrl = target.url;
    urlChanges.emit(target.url);
  }
}

const startWatching = once(async () => {
  browser.webNavigation.onCommitted.addListener(onNavigation);
  tabUrl = await getCurrentInspectedURL();
  urlChanges.emit(tabUrl);
});

/**
 * Returns the current URL of the inspected tab, or nullish if value is not initialized yet.
 */
export default function useCurrentInspectedUrl(): Nullishable<string> {
  expectContext("pageEditor");

  const [url, setUrl] = useState(tabUrl);

  useEffect(() => {
    urlChanges.add(setUrl);
    void startWatching();
    return () => {
      urlChanges.remove(setUrl);
    };
  }, [setUrl]);

  return url;
}
