/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { FORWARD_FRAME_DATA, REQUEST_FRAME_DATA } from "@/messaging/constants";
import { browser, WebRequest } from "webextension-polyfill-ts";
type OnBeforeSendHeadersDetailsType = WebRequest.OnBeforeSendHeadersDetailsType;
type OnHeadersReceivedDetailsType = WebRequest.OnHeadersReceivedDetailsType;
type RequestFilter = chrome.webRequest.RequestFilter;
type MessageSender = chrome.runtime.MessageSender;

const _frameData: { [key: string]: string } = {};

type Request =
  | {
      type: typeof FORWARD_FRAME_DATA;
      payload: { frameId: string; html: string };
    }
  | { type: typeof REQUEST_FRAME_DATA; payload: { id: string } };

function removeFrameOptionsHeader(info: OnHeadersReceivedDetailsType) {
  console.debug(`Removing frame options header for: ${info.url}`);
  return {
    responseHeaders: info.responseHeaders.filter((header) => {
      const headerName = header.name.toLowerCase();
      return headerName != "x-frame-options" && headerName != "frame-options";
    }),
  };
}

function removeSecHeaders(info: OnBeforeSendHeadersDetailsType) {
  console.debug(`Removing sec headers for: ${info.url}`);
  return {
    responseHeaders: info.requestHeaders.filter((header) => {
      const headerName = header.name.toLowerCase();
      return headerName != "sec-fetch-dest" && headerName != "sec-fetch-site";
    }),
  };
}

const DATA_ROBOT_SITE_FILTER: RequestFilter = {
  urls: [
    "https://*.apps2.datarobot.com/*",
    "https://*.datarobot.com/*",
    "https://datarobot.com/*",
  ],
  types: ["sub_frame"],
};

function initFrames(): void {
  console.info("Initializing webRequest listeners");

  browser.webRequest.onBeforeSendHeaders.addListener(
    removeSecHeaders,
    DATA_ROBOT_SITE_FILTER,
    [
      "blocking",
      "requestHeaders",
      // Modern Chrome needs 'extraHeaders' to see and change this header,
      // so the following code evaluates to 'extraHeaders' only in modern Chrome.
      // https://developer.chrome.com/docs/extensions/reference/webRequest/
      "extraHeaders",
    ]
  );

  browser.webRequest.onHeadersReceived.addListener(
    removeFrameOptionsHeader,
    DATA_ROBOT_SITE_FILTER,
    [
      "blocking",
      "responseHeaders",
      // Modern Chrome needs 'extraHeaders' to see and change this header,
      // so the following code evaluates to 'extraHeaders' only in modern Chrome.
      // https://developer.chrome.com/docs/extensions/reference/webRequest/
      "extraHeaders",
    ]
  );

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
