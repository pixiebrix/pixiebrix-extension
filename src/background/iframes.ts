import { FORWARD_FRAME_DATA, REQUEST_FRAME_DATA } from "@/messaging/constants";
import MessageSender = chrome.runtime.MessageSender;

const _frameData: { [key: string]: string } = {};

type Request =
  | {
      type: typeof FORWARD_FRAME_DATA;
      payload: { frameId: string; html: string };
    }
  | { type: typeof REQUEST_FRAME_DATA; payload: { id: string } };

function initFrames(): void {
  // Save data to pass along to iframes
  chrome.runtime.onMessage.addListener(function (
    request: Request,
    sender: MessageSender,
    sendResponse
  ) {
    // Messages from content scripts should have sender.tab set
    switch (request.type) {
      case FORWARD_FRAME_DATA: {
        console.log("request", { request });
        const { frameId, html } = request.payload;
        _frameData[frameId] = html;
        sendResponse({});
        return true;
      }
      case REQUEST_FRAME_DATA: {
        const { id } = request.payload;
        console.log(`Frame data for ${id}`, { _frameData });
        sendResponse({ html: _frameData[id] });
        delete _frameData[id];
        return true;
      }
      default: {
        return false;
      }
    }
  });
}

export default initFrames;
