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

import type { LiveClient } from "@deepgram/sdk";
import pDefer from "p-defer";
import type { UnknownObject } from "@/types/objectTypes";

let liveClient: LiveClient;
let mediaRecorder: MediaRecorder;
let stream: MediaStream;

// eslint-disable-next-line prefer-destructuring -- environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Remaining Work
// - Determine if/how to get the audio from a dialer tab. This currently just captures microphone audio.
// - Move to background or a frame on the tab to avoid the CSP of the host page
//   See for considerations: https://github.com/pixiebrix/pixiebrix-extension/pull/4354/files#r979928562
// - Consider using our integration framework for passing deepgram key/setup.
// - Determine how to pass transcript/tags/etc. via events

// References
// - https://github.com/pixiebrix/pixiebrix-extension/pull/4354
// - https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture#audio-and-video
// - https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/sample.tabcapture-recorder
// - https://developer.chrome.com/docs/extensions/mv2/reference/tabCapture#method-getMediaStreamId
// - https://stackoverflow.com/questions/62321756/original-audio-of-tab-gets-muted-while-using-chrome-tabcapture-capture-and-med
// - https://www.reddit.com/r/chrome_extensions/comments/nzfd6u/capturing_audio_with_mv3/

export async function connect(): Promise<void> {
  if (DEEPGRAM_API_KEY) {
    throw new Error("Deepgram API key not configured");
  }

  if (liveClient) {
    throw new Error("Connection already exists");
  }

  // https://deepgram.com/learn/live-transcription-mic-browser
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  const { createClient, LiveTranscriptionEvents, LiveConnectionState } =
    await import(/* webpackChunkName: "createClient" */ "@deepgram/sdk");

  const client = createClient(DEEPGRAM_API_KEY);

  // https://developers.deepgram.com/reference/stt-streaming-feature-overview
  liveClient = client.listen.live({ model: "nova" });

  const connectPromise = pDefer<void>();

  liveClient.on(LiveTranscriptionEvents.Open, () => {
    connectPromise.resolve();

    liveClient.on(LiveTranscriptionEvents.Transcript, (data: UnknownObject) => {
      // TODO: decide how to combine the data
      console.log(data);
    });
  });

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (
      event.data.size > 0 &&
      liveClient?.getReadyState() === LiveConnectionState.OPEN
    ) {
      liveClient.send(event.data);
    }
  });

  await connectPromise.promise;

  // Wait to start recording until we're connected to deepgram
  mediaRecorder.start(250);
}

export async function disconnect(): Promise<void> {
  mediaRecorder.stop();
  mediaRecorder = null;

  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore
    }
  }

  liveClient.finish();
  liveClient = null;
}
