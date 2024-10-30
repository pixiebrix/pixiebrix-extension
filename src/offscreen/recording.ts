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

import {
  createClient,
  type LiveClient,
  LiveTranscriptionEvents,
  SOCKET_STATES,
} from "@deepgram/sdk";
import pDefer from "p-defer";
import { tabCapture } from "@/background/messenger/api";
import type { JsonObject } from "type-fest";
import { compact } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";

type MediaClient = {
  liveClient: LiveClient;
  recorder: MediaRecorder;
  streams: MediaStream[];
};

let mediaClient: MediaClient | null;

export function extractRecordingTabId(): number | null {
  const offscreenUrl = new URL(document.location.href);
  const regex = /recording-(?<tabId>\d+)/;
  const tabId = regex.exec(offscreenUrl.hash)?.groups?.tabId;
  return tabId ? Number.parseInt(tabId, 10) : null;
}

/**
 * Mark the current tab recording state in the offscreen document URL.
 *
 * Communicating via the URL provides a very low-bandwidth way of communicating with the service worker
 * (the service worker can check the URL of the document and see the current recording state). We can't store that
 * directly in the service worker as it may be terminated while recording is in progress. We could write it to storage
 * but that slightly increases the risk of things getting out of sync.
 *
 * @param tabId the recording tab id or null
 */
function markRecordingTab(tabId: number | null): void {
  window.location.hash = tabId == null ? "" : `recording-${tabId}`;
}

type AudioRecordingData = {
  /**
   * The Deepgram API key.
   */
  apiKey: string;
  tabId: number;
  tabStreamId: Nullishable<string>;
  captureMicrophone: boolean;
};

export async function startRecording({
  apiKey,
  tabId,
  tabStreamId,
  captureMicrophone,
}: AudioRecordingData): Promise<void> {
  if (mediaClient) {
    throw new Error("Deepgram connection already exists");
  }

  // Combine the mic and tab streams
  const context = new AudioContext();
  const analysisDestination = context.createMediaStreamDestination();

  const client = createClient(apiKey);

  // XXX: determine use of multichannel vs. diarization: https://developers.deepgram.com/docs/diarization
  // https://developers.deepgram.com/reference/stt-streaming-feature-overview
  const liveClient = client.listen.live({ model: "nova", multichannel: true });

  const connectPromise = pDefer<void>();

  liveClient.on(LiveTranscriptionEvents.Open, () => {
    if (!liveClient) {
      connectPromise.reject(new Error("Client closed before initialization"));
      return;
    }

    liveClient.on(LiveTranscriptionEvents.Transcript, (data: UnknownObject) => {
      // Known to be valid JSON because it came back from the Deepgram API
      tabCapture.forwardAudioCaptureEvent(data as JsonObject);
      console.debug(data);
    });

    // Call after setting up the event listeners, so we don't miss any events
    connectPromise.resolve();
  });

  let micStream: MediaStream | null = null;

  if (captureMicrophone) {
    // NOTE: call to get microphone will fail if extension doesn't already have microphone permissions
    // https://github.com/GoogleChrome/chrome-extensions-samples/issues/627#issuecomment-1737511452
    // https://github.com/GoogleChrome/chrome-extensions-samples/issues/821
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const micSource = context.createMediaStreamSource(micStream);
    micSource.connect(analysisDestination);
  }

  let tabStream: MediaStream | null = null;

  if (tabStreamId) {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-expect-error -- incorrect types
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: tabStreamId,
        },
      },
      video: false,
    });

    const tabSource = context.createMediaStreamSource(tabStream);
    tabSource.connect(analysisDestination);

    // Continue to play the captured audio to the user
    tabSource.connect(context.destination);
  }

  const recorder = new MediaRecorder(analysisDestination.stream);

  recorder.addEventListener("dataavailable", (event) => {
    if (
      event.data.size > 0 &&
      liveClient?.getReadyState() === SOCKET_STATES.open
    ) {
      liveClient.send(event.data);
    }
  });

  // Set module variable before async connection to avoid repeat connections
  mediaClient = {
    liveClient,
    recorder,
    streams: compact([micStream, tabStream]),
  };

  // Wait to start recording until we're connected to deepgram
  await connectPromise.promise;

  recorder.start(250);

  markRecordingTab(tabId);
}

export async function stopRecording(): Promise<void> {
  if (!mediaClient) {
    console.debug("Recording not in progress");
    return;
  }

  const { recorder, liveClient, streams } = mediaClient;

  recorder.stop();
  liveClient.requestClose();

  // Stop so the recording icon goes away
  for (const track of recorder.stream.getTracks()) {
    track.stop();
  }

  // :shrug: recording icon wasn't going away when just stopping tracks via recorder.stream
  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  mediaClient = null;
  markRecordingTab(null);
}
