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

import type { MessageContext } from "@/types/loggerTypes";
import { type TelemetryUser } from "@/telemetry/telemetryTypes";
import { type SemVerString } from "@/types/registryTypes";
import { type SerializedError } from "@/types/messengerTypes";
import { deserializeError } from "serialize-error";
import {
  createClient,
  type LiveClient,
  LiveTranscriptionEvents,
  SOCKET_STATES,
} from "@deepgram/sdk";
import { type Nullishable } from "@/utils/nullishUtils";
import pDefer from "p-defer";
import { type JsonObject } from "type-fest";
import { tabCapture } from "@/background/messenger/api";

// eslint-disable-next-line prefer-destructuring -- environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

type MediaClient = {
  liveClient: LiveClient;
  recorder: MediaRecorder;
};

let mediaClient: MediaClient | null;

export type RecordErrorMessage = {
  target: "offscreen-doc";
  type: "record-error";
  data: {
    error: SerializedError;
    errorMessage: string;
    errorReporterInitInfo: {
      versionName: string;
      telemetryUser: TelemetryUser;
    };
    messageContext: MessageContext &
      UnknownObject & { extensionVersion: SemVerString };
  };
};

export type StartAudioCaptureMessage = {
  type: "start-recording";
  target: "offscreen";
  data: {
    tabId: number;
    tabStreamId: Nullishable<string>;
    captureMicrophone: boolean;
  };
};

export type StopAudioCaptureMessage = {
  type: "stop-recording";
  target: "offscreen";
};

function isRecordErrorMessage(message: unknown): message is RecordErrorMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen-doc" &&
    "type" in message &&
    message.type === "record-error"
  );
}

function isStartAudioCaptureMessage(
  message: unknown,
): message is StartAudioCaptureMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen" &&
    "type" in message &&
    message.type === "start-recording"
  );
}

function isStopAudioCaptureMessage(
  message: unknown,
): message is StopAudioCaptureMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen" &&
    "type" in message &&
    message.type === "stop-recording"
  );
}

export const sendErrorViaErrorReporter = async (
  data: RecordErrorMessage["data"],
) => {
  const { error, errorMessage, errorReporterInitInfo, messageContext } = data;

  // WARNING: the prototype chain is lost during deserialization, so make sure any predicates you call here
  // to determine log level also handle serialized/deserialized errors.
  // See https://github.com/sindresorhus/serialize-error/issues/48

  const { getErrorReporter } = await import(
    /* webpackChunkName: "errorReporter" */
    "@/telemetry/initErrorReporter"
  );

  const { versionName, telemetryUser } = errorReporterInitInfo;
  const reporter = await getErrorReporter(versionName, telemetryUser);

  if (!reporter) {
    // Error reporter not initialized
    return;
  }

  reporter.error({
    message: errorMessage,
    error: deserializeError(error),
    messageContext,
  });
};

/**
 * Record the current state in the URL. This provides a very low-bandwidth way of communicating with the service worker
 * (the service worker can check the URL of the document and see the current recording state). We can't store that
 * directly in the service worker as it may be terminated while recording is in progress. We could write it to storage
 * but that slightly increases the risk of things getting out of sync.
 * @param tabId the recording tab id or null
 */
function markRecordingTab(tabId: number | null): void {
  if (tabId == null) {
    window.location.hash = "";
    return;
  }

  window.location.hash = `recording-${tabId}`;
}

async function startRecording({
  tabId,
  tabStreamId,
  // TODO: implement controlling whether microphone is captured
  captureMicrophone,
}: {
  tabId: number;
  tabStreamId: Nullishable<string>;
  captureMicrophone: boolean;
}): Promise<void> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("Deepgram API key not configured");
  }

  if (mediaClient) {
    throw new Error("Connection already exists");
  }

  // NOTE: call to get microphone will fail if extension doesn't already have microphone permissions
  // https://github.com/GoogleChrome/chrome-extensions-samples/issues/627#issuecomment-1737511452
  // https://github.com/GoogleChrome/chrome-extensions-samples/issues/821
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      // @ts-expect-error -- incorrect types
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: tabStreamId,
      },
    },
    video: false,
  });

  const client = createClient(DEEPGRAM_API_KEY);

  // TODO: determine use of multichannel vs. diarization: https://developers.deepgram.com/docs/diarization
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

  // Continue to play the captured audio to the user
  const context = new AudioContext();
  const micSource = context.createMediaStreamSource(micStream);
  const tabSource = context.createMediaStreamSource(tabStream);
  tabSource.connect(context.destination);

  // Combine the mic and tab streams
  const analysisDestination = context.createMediaStreamDestination();
  micSource.connect(analysisDestination);
  tabSource.connect(analysisDestination);

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
  mediaClient = { liveClient, recorder };

  // Wait to start recording until we're connected to deepgram
  await connectPromise.promise;

  recorder.start(250);

  markRecordingTab(tabId);
}

async function stopRecording(): Promise<void> {
  if (!mediaClient) {
    console.debug("Recording not in progress");
    return;
  }

  const { recorder, liveClient } = mediaClient;

  recorder.stop();
  liveClient.finish();

  // TODO: double-check this doesn't disrupt the dialer on the page
  // Stop so the recording icon goes away
  for (const track of recorder.stream.getTracks()) {
    track.stop();
  }

  mediaClient = null;
  markRecordingTab(null);
}

async function handleMessages(message: unknown): Promise<void> {
  if (isRecordErrorMessage(message)) {
    await sendErrorViaErrorReporter(message.data);
  } else if (isStartAudioCaptureMessage(message)) {
    await startRecording(message.data);
  } else if (isStopAudioCaptureMessage(message)) {
    await stopRecording();
  }
}

// Use optional chaining in case the chrome runtime is not available:
// https://github.com/pixiebrix/pixiebrix-extension/issues/8397
chrome.runtime?.onMessage?.addListener(handleMessages);
