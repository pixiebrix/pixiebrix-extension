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

import { BusinessError } from "../errors/businessErrors";
import parseDataUrl, { convertDataUrl } from "./parseDataUrl";
import { getErrorMessage } from "../errors/errorHelpers";

// SVG images don't have any EXIF data
const dataUrlBase64Image = /^data:image\/(png|jpg);base64,/;

/**
 * Load an image URL into an ArrayBuffer, preserving its original binary data (required for EXIF for example)
 *
 * This supports all URLs, including data: and blob: (neither one of which would trigger an HTTP request)
 */
export async function loadImageBinaryData(
  imageUrl: string,
): Promise<ArrayBuffer> {
  if (dataUrlBase64Image.test(imageUrl)) {
    try {
      return convertDataUrl(imageUrl, "ArrayBuffer");
    } catch {
      // The conversion failed, continue to the `fetch` fallback, which offers better errors
    }
  }

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  if (blob.type === "image/svg+xml") {
    throw new BusinessError("SVG images should be read as text");
  }

  return blob.arrayBuffer();
}

function paintImageOntoNewCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- 2d always exists
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// No error handling, just try to load it
async function getBase64FromImageViaCanvas(
  image: HTMLImageElement,
): Promise<string> {
  // Ensure it's loaded
  await image.decode();
  const canvas = paintImageOntoNewCanvas(image);
  const dataURL = canvas.toDataURL("image/png");
  const parsed = parseDataUrl(dataURL);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The browser just generated it, it's safe. If it fails, then it's likely a bug in `parseDataUrl` and it should be fixed.
  return parsed!.encodedBody;
}

/**
 * Returns base64 encoding of the image from an <img> tag.
 *
 * @warning The base64 encoding is not guaranteed to match the original image binary. For that, use `loadImageBinaryData`
 * @warning If the loaded image is not CORS-safe, a new HTTP request will be made.
 */
export async function loadImageAsBase64(
  image: HTMLImageElement,
): Promise<string> {
  // Attempt to use the existing base64 data, if any
  if (image.src.startsWith("data:image")) {
    const parsed = parseDataUrl(image.src);
    if (parsed?.isBase64) {
      return parsed?.encodedBody;
    }
  }

  try {
    return await getBase64FromImageViaCanvas(image);
  } catch (error) {
    if (!getErrorMessage(error).includes("Tainted canvases")) {
      throw error;
    }

    // It's a CORS issue https://github.com/pixiebrix/pixiebrix-extension/issues/7673
  }

  // We could use `loadImageBinaryData`, but this method also supports SVGs
  const corsSafeImage = new Image();
  corsSafeImage.crossOrigin = "anonymous";
  corsSafeImage.src = image.src;
  return getBase64FromImageViaCanvas(corsSafeImage);
}
