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

import { type MessengerMeta } from "webext-messenger";
import type { SanitizedConfig } from "@/integrations/integrationTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import type { StartMessage } from "@/tinyPages/offscreen";
import { emitAudioEvent } from "@/contentScript/messenger/api";
import type { JsonObject } from "type-fest";
import { TOP_LEVEL_FRAME_ID } from "@/domConstants";

/**
 * Whether audio is currently being recorded. Kept in sync across worker reloads via the offscreen document hash.
 */
let recordingTabId: Nullishable<number>;

/**
 * Capture the visible tab as a PNG image.
 */
export async function captureTab(this: MessengerMeta): Promise<string> {
  return browser.tabs.captureVisibleTab(this.trace[0].tab.windowId, {
    format: "png",
  });
}

export async function startAudioCapture(
  this: MessengerMeta,
  {
    integrationConfig,
    captureMicrophone,
    captureTab,
  }: {
    integrationConfig: SanitizedConfig;
    captureMicrophone: boolean;
    captureTab: boolean;
  },
): Promise<void> {
  // If called from MV3 sidebar, the tab ID is not available.
  const tabId = Number.parseInt(
    String(
      this.trace[0].tab?.id ??
        new URL(this.trace[0].url).searchParams.get("tabId"),
    ),
    10,
  );

  const existingContexts = await chrome.runtime.getContexts({});

  const offscreenDocument = existingContexts.find(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- errors at runtime when importing enum
    (x) => x.contextType === "OFFSCREEN_DOCUMENT",
  );

  // Re-sync background worker state with event page state
  if (offscreenDocument) {
    const offscreenUrl = new URL(offscreenDocument.documentUrl);
    const regex = /recording-(?<tabId>\d+)/;
    const tabId = regex.exec(offscreenUrl.hash)?.groups?.tabId;
    recordingTabId = tabId ? Number.parseInt(tabId, 10) : null;
  }

  if (recordingTabId === tabId) {
    // NOTE: not checking if capture args are the same
    console.debug("Already recording tab", { tabId: recordingTabId });
    return;
  }

  if (recordingTabId && recordingTabId !== tabId) {
    // TODO: stop capture and recursively call startAudioCapture
    throw new Error("Switching recording tab is not implemented");
  }

  if (!offscreenDocument) {
    // If an offscreen document is not already open, create one.
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      // @ts-expect-error -- errors at runtime when importing reasons
      reasons: ["USER_MEDIA"],
      justification: "Recording from chrome.tabCapture API",
    });
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
  } satisfies StartMessage);

  recordingTabId = tabId;
}

export async function stopAudioCapture(this: MessengerMeta): Promise<void> {
  await chrome.runtime.sendMessage({
    type: "stop-recording",
    target: "offscreen",
  });

  recordingTabId = null;
}

/**
 * Forward an audio capture event to the contentScript.
 */
export async function forwardAudioCaptureEvent(
  this: MessengerMeta,
  data: JsonObject,
): Promise<void> {
  // TODO: can the offscreen document message the contentScript directly?
  if (recordingTabId == null) {
    console.debug("Ignoring event because no tab is recording");
    return;
  }

  emitAudioEvent({ tabId: recordingTabId, frameId: TOP_LEVEL_FRAME_ID }, data);
}
