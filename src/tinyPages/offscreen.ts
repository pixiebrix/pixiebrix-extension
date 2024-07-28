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
import { getErrorMessage } from "@/errors/errorHelpers";

let createOffscreenDocumentPromise: Promise<void> | null = null;

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

// Creates an offscreen document at a fixed url, if one does not already exist. Note that only one offscreen document
// can be active at a time per extension, so it's unlikely that you'll want to introduce additional html documents for
// that purpose.
export async function setupOffscreenDocument() {
  /*
   * WARNING: The runtime.getContexts() api is crashing the browser under
   *  certain conditions in chrome versions >127.0.6533.73. See issue
   *  tracker here: https://issues.chromium.org/issues/355625882
   *
   * Dangerous code to check if the offscreen document exists:

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });


  if (existingContexts.length > 0) {
    return;
  }

   *
   * Also, there is currently a function present in the chrome.offscreen api
   * called hasDocument. This function is not documented in the chrome docs:
   *   https://developer.chrome.com/docs/extensions/reference/api/offscreen#method
   * Apparently, this function should not be treated as "stable," and may be
   * removed in the future, if/when more functionality is added to the offscreen api:
   *   https://issues.chromium.org/issues/40849649#:~:text=hasDocument()%20returns%20whether,in%20testing%20contexts.
   *
   * Currently, PixieBrix only uses an offscreen document in this one place,
   * to support DataDog error reporting. So, the safest thing right now is to
   * wrap the createDocument() in a try-catch and look for the error text to
   * match "Only a single offscreen document may be created" to detect when
   * the offscreen document has already been created.
   */

  if (createOffscreenDocumentPromise == null) {
    try {
      console.debug("Creating the offscreen document");
      createOffscreenDocumentPromise = chrome.offscreen.createDocument({
        url: "offscreen.html",
        // Our reason for creating an offscreen document does not fit nicely into options offered by the Chrome API, which
        // is error telemetry as of 1.8.13 (we use this as a workaround for Datadog SDK service worker limitations).
        // We chose BLOBS because it's the closest to interaction with error objects.
        // See https://developer.chrome.com/docs/extensions/reference/api/offscreen#reasons
        reasons: [chrome.offscreen.Reason.BLOBS],
        justification:
          "Error telemetry SDK usage that is incompatible with service workers",
      });
      await createOffscreenDocumentPromise;
    } catch (error) {
      createOffscreenDocumentPromise = null;

      const errorMessage = getErrorMessage(error);
      if (
        errorMessage.includes("Only a single offscreen document may be created")
      ) {
        console.debug("Offscreen document already exists");
        return;
      }

      throw new Error(
        "Error occurred while creating the offscreen document used for error reporting",
        {
          cause: error,
        },
      );
    }

    createOffscreenDocumentPromise = null;
    console.debug("Offscreen document created successfully");
  } else {
    console.debug(
      "Offscreen document creation in progress from a previous call",
    );
    await createOffscreenDocumentPromise;
  }
}

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

export async function sendErrorViaErrorReporter(
  data: RecordErrorMessage["data"],
): Promise<void> {
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

  // TODO: double-check stopping the recorder doesn't disrupt the dialer on the page
  // Stop so the recording icon goes away
  for (const track of recorder.stream.getTracks()) {
    track.stop();
  }

  mediaClient = null;
  markRecordingTab(null);
}

// Use optional chaining in case the chrome runtime is not available:
// https://github.com/pixiebrix/pixiebrix-extension/issues/8397
chrome.runtime?.onMessage?.addListener(async (message: unknown) => {
  if (isRecordErrorMessage(message)) {
    await sendErrorViaErrorReporter(message.data);
  } else if (isStartAudioCaptureMessage(message)) {
    await startRecording(message.data);
  } else if (isStopAudioCaptureMessage(message)) {
    await stopRecording();
  }
});
