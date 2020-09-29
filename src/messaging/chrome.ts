// @ts-ignore: babel/plugin-transform-typescript doesn't support the import = syntax
import chromeNamespace from "chrome";
type MessageSendOptions = chromeNamespace.tabs.MessageSendOptions;

interface Message {
  type: string;
}

export function sendTabMessage(
  tabId: number,
  message: Message,
  options: MessageSendOptions
): Promise<unknown> {
  // https://developer.chrome.com/extensions/tabs#method-sendMessage
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, options, (response) => {
      if (response === undefined) {
        const error = chrome.runtime.lastError;
        console.error("Tab message error", error);
        reject(new Error(error.message));
      }
      console.debug(`RECEIVE: ${message.type}`, response);
      resolve(response);
    });
  });
}

export function sendTabNotification(
  tabId: number,
  notification: Message,
  options: MessageSendOptions
): void {
  // https://developer.chrome.com/extensions/tabs#method-sendMessage
  chrome.tabs.sendMessage(tabId, notification, options);
}

type SendScriptMessage = (payload: any) => Promise<any>;

export function createSendScriptMessage(
  messageType: string
): SendScriptMessage {
  let messageSeq = 0;
  const fulfillmentCallbacks: { [key: string]: (result: any) => void } = {};
  const rejectionCallbacks: { [key: string]: (result: any) => void } = {};

  document.addEventListener(`${messageType}_FULFILLED`, function (
    e: CustomEvent
  ) {
    console.debug(`RECEIVED: ${messageType}_FULFILLED`, e.detail);
    const { id, result } = e.detail;
    if (fulfillmentCallbacks.hasOwnProperty(id)) {
      try {
        fulfillmentCallbacks[id](result);
      } finally {
        delete fulfillmentCallbacks[id];
        delete rejectionCallbacks[id];
      }
    }
  });

  document.addEventListener(`${messageType}_REJECTED`, function (
    e: CustomEvent
  ) {
    console.debug(`RECEIVED: ${messageType}_REJECTED`, e.detail);
    const { id, error } = e.detail;
    if (rejectionCallbacks.hasOwnProperty(id)) {
      try {
        rejectionCallbacks[id](error);
      } finally {
        delete fulfillmentCallbacks[id];
        delete rejectionCallbacks[id];
      }
    }
  });

  return (payload) => {
    const id = messageSeq++;
    const promise = new Promise((resolve, reject) => {
      fulfillmentCallbacks[id] = resolve;
      rejectionCallbacks[id] = reject;
    });
    console.debug(`SEND: ${messageType}`, payload);
    document.dispatchEvent(
      new CustomEvent(messageType, {
        detail: {
          id,
          ...payload,
        },
      })
    );
    return promise;
  };
}
