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

/**
 * @file and security
 * 1. The content script generates an iframe with a local document.
 * 2. postMessage only works with `"*"` in this direction
 *    https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#using_window.postmessage_in_extensions_non-standard
 * 3. The iframe is safe because it's local and wrapped in a Shadow DOM,
 *    thus inaccessible/not-alterable by the host website.
 * 4. Each content script message includes a private channel port that the
 *    iframe can use to respond exclusively to the content script.
 * 5. The channel is closed immediately after the response.
 *
 * Prior art: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/IPJSfjNSgh8/m/Dh35-tZPAgAJ
 * Relevant discussion: https://github.com/w3c/webextensions/issues/78
 */

import {
  PostMessageInfo,
  PostMessageListener,
  RequestPacket,
} from "@/utils/postMessage";

const window = new EventTarget();
export default async function postMessage({ type, payload }: PostMessageInfo) {
  const packet: RequestPacket = {
    type,
    payload,
  };
  console.log("will post", packet);

  window.dispatchEvent(
    new MessageEvent("message", {
      data: packet,
    })
  );
}

export function addPostMessageListener(
  type: string,
  listener: PostMessageListener,
  { signal }: { signal?: AbortSignal } = {}
): void {
  console.log("will listen to", type);
  window.addEventListener(
    "message",
    (event: MessageEvent<RequestPacket>) => {
      if (event.data.type === type) {
        listener(event.data.payload);
      }
    },
    { signal }
  );
}
