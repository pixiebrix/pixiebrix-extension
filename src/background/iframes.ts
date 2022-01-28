/* eslint-disable filenames/match-exported */
/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { FORWARD_FRAME_DATA, REQUEST_FRAME_DATA } from "@/messaging/constants";

type MessageSender = chrome.runtime.MessageSender;

const frameHTML = new Map<string, string>();

type Request =
  | {
      type: typeof FORWARD_FRAME_DATA;
      payload: { frameId: string; html: string };
    }
  | { type: typeof REQUEST_FRAME_DATA; payload: { id: string } };

function initFrames(): void {
  // Save data to pass along to iframes
  chrome.runtime.onMessage.addListener(
    (request: Request, sender: MessageSender, sendResponse) => {
      // Messages from content scripts should have sender.tab set
      switch (request.type) {
        case FORWARD_FRAME_DATA: {
          console.log("request", { request });
          const { frameId, html } = request.payload;
          frameHTML.set(frameId, html);
          sendResponse({});
          return true;
        }

        case REQUEST_FRAME_DATA: {
          const { id } = request.payload;
          sendResponse({ html: frameHTML.get(id) });
          frameHTML.delete(id);
          return true;
        }

        default: {
          return false;
        }
      }
    }
  );
}

export default initFrames;
