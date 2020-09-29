import {
  CONNECT_PAGE,
  EXTENSION_STORE_DISPATCH,
  EXTENSION_STORE_GET,
  OPEN_OPTIONS,
  SET_EXTENSION_AUTH,
} from "@/messaging/constants";
import { updateExtensionAuth } from "@/auth/token";
import { openOptions } from "@/chrome";
import store from "@/background/store";

function messageHandler(request, sendResponse) {
  switch (request.type) {
    case CONNECT_PAGE: {
      sendResponse(chrome.runtime.getManifest());
      break;
    }
    case SET_EXTENSION_AUTH: {
      const auth = request.payload;
      updateExtensionAuth(auth).then(sendResponse);
      return true;
    }
    case EXTENSION_STORE_GET: {
      sendResponse(store.getState());
      break;
    }
    case EXTENSION_STORE_DISPATCH: {
      const action = request.payload;
      sendResponse(store.dispatch(action));
      break;
    }
    case OPEN_OPTIONS: {
      openOptions()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error }));
      return true;
    }
    default: {
      console.debug(`Unexpected message type: ${request.type}`);
    }
  }
}

function initWebsiteProtocol() {
  if (chrome.runtime.onMessageExternal) {
    chrome.runtime.onMessageExternal.addListener(
      (request, sender, sendResponse) => {
        console.debug(`onMessageExternal ${request.type}`);
        messageHandler(request, sendResponse);
      }
    );
    console.debug("Attached onMessageExternal");
  } else {
    console.debug("Not attaching onMessageExternal because it's not available");
  }
}

export default initWebsiteProtocol;
