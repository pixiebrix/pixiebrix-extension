// Receive message from content script to make request to a service
import {
  CONTENT_SCRIPT_ERROR,
  HTTP_REQUEST,
  HTTP_REQUEST_POST,
  NOTIFICATION_CREATE,
} from "@/messaging/constants";
import axios from "axios";
import Rollbar from "rollbar";

function initExtensionProtocol() {
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    const forwardResponse = (requestPromise: Promise<unknown>) =>
      requestPromise
        .then(({ data }) => {
          sendResponse(data);
        })
        .catch((err) => {
          sendResponse({
            data: null,
            error: err.toString(),
            statusCode: err.response.status,
          });
        });

    switch (request.type) {
      case HTTP_REQUEST_POST: {
        const { url, data, ...config } = request.payload;
        const requestPromise = axios.post(url, data, config);
        forwardResponse(requestPromise);
        return true;
      }
      case HTTP_REQUEST: {
        const config = request.payload;
        const requestPromise = axios(config);
        forwardResponse(requestPromise);
        return true;
      }
      case NOTIFICATION_CREATE: {
        chrome.notifications.create(
          undefined, // generate id automatically
          request.payload,
          (notificationId) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ id: notificationId });
            }
          }
        );
        return true;
      }
      case CONTENT_SCRIPT_ERROR: {
        // TODO: collect the errors and context in the backend to create a stream by type
        const { error, context } = request.payload;
        try {
          // @ts-ignore: not sure how to distinguish between the class and the namespace in the rollbar file
          Rollbar.error(error.message, error);
        } catch (ex) {
          console.error(error.message, context);
        }
        return false;
      }
      default: {
        return false;
      }
    }
  });
}

export default initExtensionProtocol;
