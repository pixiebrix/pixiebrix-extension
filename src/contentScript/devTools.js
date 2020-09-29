import { DEV_WATCH_READER } from "@/messaging/constants";
import { clearObject } from "@/utils";

function initDevToolsProtocol(readers) {
  chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(({ type, payload }) => {
      switch (type) {
        case DEV_WATCH_READER: {
          const { id } = payload;
          // for now only watch a single reader
          clearObject(readers);
          _watchedReaders[id] = port;
          console.debug(`Installed reader ${id}`);
          break;
        }
        default: {
          break;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      clearObject(readers);
    });
  });
}

export default initDevToolsProtocol;
