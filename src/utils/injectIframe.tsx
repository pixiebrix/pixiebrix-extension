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

import { waitForBody } from "@/utils";
import pDefer from "p-defer";
import pTimeout from "p-timeout";
import shadowWrap from "@/utils/shadowWrap";

const TIMEOUT_MS = 3000;

export const hiddenIframeStyle: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  bottom: "105%",
  right: "105%",
  visibility: "hidden",
} as const;

/** Injects an iframe into the host page via ShadowDom */
async function _injectIframe(
  url: string,
  /** The style is required because you never want an unstyled iframe */
  style: Partial<CSSStyleDeclaration>
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement("iframe");
  const { promise: iframeLoad, resolve } = pDefer();
  iframe.addEventListener("load", resolve);
  iframe.src = url;
  Object.assign(iframe.style, style);

  // The body might not be available yet
  await waitForBody();
  document.body.append(shadowWrap(iframe));

  await iframeLoad;

  return iframe;
}

const injectIframe: typeof _injectIframe = async (url, style) =>
  pTimeout(_injectIframe(url, style), {
    milliseconds: TIMEOUT_MS,
    message: `The iframe did not load within ${
      TIMEOUT_MS / 1000
    } seconds: ${url}`,
  });

export default injectIframe;
