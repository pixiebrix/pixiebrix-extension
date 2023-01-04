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

import { once } from "lodash";
import { useEffect, useState } from "react";
import { type Target } from "@/types";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { type WebNavigation } from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import { getCurrentURL } from "@/pageEditor/utils";

let tabUrl: string;
const TOP_LEVEL_FRAME_ID = 0;

const urlChanges = new SimpleEventTarget<string>();

// The pageEditor only cares for the top frame
function isCurrentTopFrame({ tabId, frameId }: Target) {
  return (
    frameId === TOP_LEVEL_FRAME_ID &&
    tabId === browser.devtools.inspectedWindow.tabId
  );
}

async function onNavigation(
  target: WebNavigation.OnCommittedDetailsType
): Promise<void> {
  if (isCurrentTopFrame(target)) {
    tabUrl = target.url;
    urlChanges.emit(target.url);
  }
}

const startWatching = once(async () => {
  browser.webNavigation.onCommitted.addListener(onNavigation);
  tabUrl = await getCurrentURL();
  urlChanges.emit(tabUrl);
});

export default function useCurrentUrl(): string {
  expectContext("devTools");

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
