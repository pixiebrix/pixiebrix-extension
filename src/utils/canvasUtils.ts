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
import resizeToFit from "intrinsic-scale";

export async function loadImageData(
  url: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const { data: blob } = await axios.get<Blob>(url, { responseType: "blob" });
  return blobToImageData(blob, width, height);
}

async function blobToImageBitmapWithDom(blob: Blob): Promise<ImageBitmap> {
  // `createImageBitmap` does not support SVGs directly from blobs, but it supports them via <img>
  if (blob.type !== "image/svg+xml") {
    return createImageBitmap(blob);
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  return createImageBitmap(image);
}

/**
 * Converts a blob into ImageData.
 *
 * You can specify the desired width and height of the resulting ImageData, the aspect ratio will be preserved
 */
export async function blobToImageData(
  blob: Blob,
  width: number,
  height: number,
): Promise<ImageData> {
  const imageBitmap = await blobToImageBitmapWithDom(blob);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- 2d always exists
  const context = new OffscreenCanvas(width, height).getContext("2d")!;

  // Preserve aspect ratio
  const target = resizeToFit("contain", imageBitmap, { width, height });
  context.drawImage(
    imageBitmap,
    Math.trunc(target.x),
    Math.trunc(target.y),
    Math.trunc(target.width),
    Math.trunc(target.height),
  );
  imageBitmap.close();
  return context.getImageData(0, 0, width, height);
}
