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

import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { type MessengerMeta, type Sender } from "webext-messenger";
import { type SanitizedConfig } from "@/integrations/integrationTypes";
import { type JsonObject } from "type-fest";
import {
  type StartAudioCaptureMessage,
  type StopAudioCaptureMessage,
} from "@/tinyPages/offscreen";
import { emitAudioEvent } from "@/contentScript/messenger/api";
import { TOP_LEVEL_FRAME_ID } from "@/domConstants";
import ensureOffscreenDocument, {
  getOffscreenDocument,
  getRecordingTab,
} from "@/tinyPages/ensureOffscreenDocument";

/**
 * Whether audio is currently being recorded. Kept in sync across worker reloads via the offscreen document hash.
 */
let audioCaptureTabId: Nullishable<number>;

export async function captureTab(this: MessengerMeta): Promise<string> {
  const windowId = this.trace[0]?.tab?.windowId;
  assertNotNullish(windowId, "captureTab can only be called from a tab");
  return browser.tabs.captureVisibleTab(windowId, {
    format: "png",
  });
}

function getSenderTabId(sender: Sender): number {
  const tabId = sender.tab?.id;

  if (tabId) {
    return tabId;
  }

  assertNotNullish(sender.url, "Expected sender.url from webext-messenger");

  const tabIdQuery = new URL(sender.url).searchParams.get("tabId");

  assertNotNullish(tabIdQuery, "Expected tabId URL search parameter");

  // If called from MV3 sidebar, the tab ID is not available. Find the tab ID from the sidebar's tabId query parameter
  return Number.parseInt(tabIdQuery, 10);
}

export async function startAudioCapture(
  this: MessengerMeta,
  {
    // TODO: take an integration config for controlling which deepgram account to use
    integrationConfig,
    captureMicrophone,
    captureTab,
  }: {
    integrationConfig: SanitizedConfig;
    captureMicrophone: boolean;
    captureTab: boolean;
  },
): Promise<void> {
  const sender = this.trace[0];
  assertNotNullish(sender, "Expected sender from webext-messenger");
  const tabId = getSenderTabId(sender);

  const offscreenDocument = await getOffscreenDocument();

  // Re-sync background worker state with event page state
  if (offscreenDocument) {
    audioCaptureTabId = await getRecordingTab();
  }

  if (audioCaptureTabId === tabId) {
    // NOTE: not checking if capture args are the same
    console.debug("Already recording tab", { tabId: audioCaptureTabId });
    return;
  }

  if (audioCaptureTabId && audioCaptureTabId !== tabId) {
    // TODO: stop capture and recursively call startAudioCapture
    throw new Error("Switching recording tab is not implemented");
  }

  // If an offscreen document is not already open, create one.
  if (!offscreenDocument) {
    await ensureOffscreenDocument();
  }

  // Get a MediaStream for the active tab.
  let tabStreamId: Nullishable<string>;
  if (captureTab) {
    // TODO: fix typings so we can use await on chrome API directly here
    tabStreamId = await new Promise<string>((resolve) => {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: tabId },
        (streamId: string) => {
          resolve(streamId);
        },
      );
    });
  }

  // Send the stream ID to the offscreen document to start recording.
  await chrome.runtime.sendMessage({
    type: "start-recording",
    target: "offscreen",
    data: {
      tabId,
      tabStreamId,
      captureMicrophone,
    },
  } satisfies StartAudioCaptureMessage);

  audioCaptureTabId = tabId;
}

export async function stopAudioCapture(this: MessengerMeta): Promise<void> {
  void chrome.runtime.sendMessage({
    type: "stop-recording",
    target: "offscreen",
  } satisfies StopAudioCaptureMessage);

  audioCaptureTabId = null;
}

/**
 * Forward an audio capture event to the contentScript of the tab being captured.
 */
export function forwardAudioCaptureEvent(
  this: MessengerMeta,
  data: JsonObject,
): void {
  // TODO: can the offscreen document message the contentScript directly?
  if (audioCaptureTabId == null) {
    console.debug("Ignoring event because no tab is recording");
    return;
  }

  emitAudioEvent(
    { tabId: audioCaptureTabId, frameId: TOP_LEVEL_FRAME_ID },
    data,
  );
}
