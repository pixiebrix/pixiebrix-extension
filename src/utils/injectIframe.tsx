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

import pDefer from "p-defer";
import pTimeout from "p-timeout";
import shadowWrap from "@/utils/shadowWrap";
import { waitForDocumentRoot } from "@/utils/domUtils";

const TIMEOUT_MS = 3000;

export const hiddenIframeStyle: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  bottom: "105%",
  right: "105%",
  visibility: "hidden",
} as const;

export type LoadedFrame = HTMLIFrameElement & {
  contentDocument: Document;
  contentWindow: Window;
};

/**
 * Returns a promise that will poll indefinitely until the given element is removed from the DOM. The promise resolves
 * when the element is removed. Meant to be used with base condition of some kind.
 * @param element The iframe to poll for removal
 */
const elementRemoved = async (element: HTMLElement) =>
  new Promise((resolve) => {
    const poll = setInterval(() => {
      if (!document.documentElement.contains(element)) {
        clearInterval(poll);
        resolve("removed");
      }
    }, 100);
  });

/** Injects an iframe into the host page via ShadowDom and waits for the iframe to finish loading. */
async function _injectIframe(
  url: string,
  /** The style is required because you never want an un-styled iframe */
  style: Partial<CSSStyleDeclaration>,
  shadowRootId?: string,
): Promise<LoadedFrame> {
  const iframe = document.createElement("iframe");
  const { promise: iframeLoad, resolve } = pDefer();
  iframe.addEventListener("load", resolve);
  iframe.src = url;
  Object.assign(iframe.style, style);
  const shadowElement = shadowWrap(iframe);

  // Append to document root (as opposed to e.g. body) to have the best chance of avoiding host page interference with
  // the injected iframe (e.g. by removing it from the DOM)
  // See https://github.com/pixiebrix/pixiebrix-extension/pull/8777
  await waitForDocumentRoot();
  document.documentElement.append(shadowElement);
  shadowElement.id = shadowRootId;

  const result = await Promise.race([
    iframeLoad,
    elementRemoved(shadowElement),
  ]);

  if (result === "removed") {
    console.warn(
      `The host page removed the iframe for ${url} before it could be loaded. Retrying...`,
    );
    return _injectIframe(url, style, shadowRootId);
  }

  return iframe as LoadedFrame;
}

const injectIframe: typeof _injectIframe = async (url, style, shadowRootId) =>
  pTimeout(_injectIframe(url, style, shadowRootId), {
    milliseconds: TIMEOUT_MS,
    message: `The iframe did not load within ${
      TIMEOUT_MS / 1000
    } seconds: ${url}`,
  });

export default injectIframe;
