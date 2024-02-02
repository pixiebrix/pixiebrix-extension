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

let isAudioRecording = false;

/**
 * Capture the visible tab as a PNG image.
 */
export async function captureTab(this: MessengerMeta): Promise<string> {
  return browser.tabs.captureVisibleTab(this.trace[0].tab.windowId, {
    format: "png",
  });
}

export async function startAudioCapture(this: MessengerMeta): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({});

  const offscreenDocument = existingContexts.find(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- errors at runtime when importing enum
    (x) => x.contextType === "OFFSCREEN_DOCUMENT",
  );

  if (isAudioRecording) {
    throw new Error("Recording already in progress");
  }

  // If an offscreen document is not already open, create one.
  if (offscreenDocument) {
    isAudioRecording = offscreenDocument.documentUrl.endsWith("#recording");
  } else {
    // Create an offscreen document.
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      // @ts-expect-error -- errors at runtime when importing reasons
      reasons: ["USER_MEDIA"],
      justification: "Recording from chrome.tabCapture API",
    });
  }

  // If called from MV3 sidebar, the tab ID is not available.
  const tabId = String(
    this.trace[0].tab?.id ??
      new URL(this.trace[0].url).searchParams.get("tabId"),
  );

  const targetTabId = Number.parseInt(tabId, 10);

  // Get a MediaStream for the active tab.
  // TODO: fix typings so we can use await on chrome API directly here
  const streamId = await new Promise<string>((resolve) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId: string) => {
      resolve(streamId);
    });
  });

  // Send the stream ID to the offscreen document to start recording.
  void chrome.runtime.sendMessage({
    type: "start-recording",
    target: "offscreen",
    data: streamId,
  });

  isAudioRecording = true;
}

export async function stopAudioCapture(this: MessengerMeta): Promise<void> {
  void chrome.runtime.sendMessage({
    type: "stop-recording",
    target: "offscreen",
  });

  isAudioRecording = false;
}
