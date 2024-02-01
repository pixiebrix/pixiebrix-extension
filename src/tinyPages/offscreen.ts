// https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/sample.tabcapture-recorder/offscreen.js

import {
  createClient,
  type LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvents,
} from "@deepgram/sdk";
import pDefer from "p-defer";
import type { UnknownObject } from "@/types/objectTypes";

let liveClient: LiveClient;
let tabRecorder: MediaRecorder;

// eslint-disable-next-line prefer-destructuring -- environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

type StartMessage = {
  type: "start-recording";
  target: "offscreen";
  data: string;
};

type StopMessage = {
  type: "stop-recording";
  target: "offscreen";
};

chrome.runtime.onMessage.addListener(
  async (message: StartMessage | StopMessage) => {
    if (message.target === "offscreen") {
      switch (message.type) {
        case "start-recording": {
          void startRecording(message.data);
          break;
        }

        case "stop-recording": {
          void stopRecording();
          break;
        }

        default: {
          throw new Error(
            `Unrecognized message: ${(message as { type: string }).type}`,
          );
        }
      }
    }
  },
);

async function startRecording(streamId: string): Promise<void> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("Deepgram API key not configured");
  }

  if (liveClient) {
    throw new Error("Connection already exists");
  }

  const microphoneStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      // @ts-expect-error -- incorrect types
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

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

  // Continue to play the captured audio to the user.
  const output = new AudioContext();
  const source = output.createMediaStreamSource(tabStream);
  source.connect(output.destination);

  const context = new AudioContext();
  context.createMediaStreamSource(microphoneStream);
  context.createMediaStreamSource(tabStream);
  // Start recording.
  context.tabRecorder = new MediaRecorder(tabStream);
  const microphoneRecorder = new MediaRecorder(microphoneStream);

  // tabRecorder.addEventListener("dataavailable", event => {
  //   if (event.data.size > 0 && liveClient?.getReadyState() === LiveConnectionState.OPEN) {
  //     liveClient.send(event.data);
  //   }
  // })

  microphoneRecorder.addEventListener("dataavailable", (event) => {
    if (
      event.data.size > 0 &&
      liveClient?.getReadyState() === LiveConnectionState.OPEN
    ) {
      liveClient.send(event.data);
    }
  });

  // Wait to start recording until we're connected to deepgram
  await connectPromise.promise;

  tabRecorder.start(250);
  microphoneRecorder.start(250);

  // Record the current state in the URL. This provides a very low-bandwidth
  // way of communicating with the service worker (the service worker can check
  // the URL of the document and see the current recording state). We can't
  // store that directly in the service worker as it may be terminated while
  // recording is in progress. We could write it to storage but that slightly
  // increases the risk of things getting out of sync.
  window.location.hash = "recording";
}

async function stopRecording(): Promise<void> {
  if (!tabRecorder) {
    console.debug("Recording not in progress");
    return;
  }

  tabRecorder.stop();

  // Stop so the recording icon goes away
  for (const track of tabRecorder.stream.getTracks()) {
    track.stop();
  }

  tabRecorder = null;

  liveClient.finish();
  liveClient = null;

  // Update current state in URL
  window.location.hash = "";
}
