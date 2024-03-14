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

import axios from "axios";

export async function loadImageData(
  url: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const { data: blob } = await axios.get<Blob>(url, { responseType: "blob" });
  return blobToImageData(blob, width, height);
}

/**
 * Converts a Blob object into ImageBitmap. Compatible with the background page and worker.
 */
export async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (blob.type === "image/svg+xml") {
    // TODO: chrome.offscreen support
  }

  return createImageBitmap(blob);
}

/**
 * Converts a ImageBitmap into ImageData. Compatible with the background page and worker.
 *
 * You can specify the desired width and height of the resulting ImageData.
 */
export async function blobToImageData(
  blob: Blob,
  width: number,
  height: number,
): Promise<ImageData> {
  const imageBitmap = await blobToImageBitmap(blob);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- 2d always exists
  const context = new OffscreenCanvas(width, height).getContext("2d")!;

  // TODO: Add support for scaling the image to the proper size even if it's not a square
  // e.g. via https://github.com/fregante/intrinsic-scale
  context.drawImage(imageBitmap, 0, 0, width, width);
  return context.getImageData(0, 0, width, width);
}
