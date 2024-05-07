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
import { isMV3 } from "@/mv3/api";

export async function loadImageData(
  url: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const { data: blob } = await axios.get<Blob>(url, { responseType: "blob" });
  return blobToImageData(blob, width, height);
}

async function loadBlobAsImage(
  blob: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  // `createImageBitmap` does not support SVGs directly from blobs, but it supports them via <img>
  if (blob.type !== "image/svg+xml") {
    return createImageBitmap(blob);
  }

  // TODO: URL.createObjectURL() and Image() is not available in service workers
  // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/u0NH7L3v9L4
  // https://github.com/pixiebrix/pixiebrix-extension/issues/7622
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  // `createImageBitmap` will fail on SVGs that lack width/height attributes, so we must use <img>
  return image;
}

function isHTMLImageElement(image: unknown): image is HTMLImageElement {
  return !isMV3 && image instanceof HTMLImageElement;
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
  const image = await loadBlobAsImage(blob);
  // Can only check for HTMLImageElement in MV2
  // TODO: Remove this check when MV3 is the only supported version and we are using only PNGs
  const isImageElement = isHTMLImageElement(image);

  // SVGs might not have width/height attributes, but they likely have a viewBox
  // so their aspect ratio is natively preserved, regardless of `resizeToFit`
  const imageSize = isImageElement ? { width, height } : image;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- 2d always exists
  const context = new OffscreenCanvas(width, height).getContext("2d")!;

  // Preserve aspect ratio (width/height) and center it (x/y)
  const target = resizeToFit("contain", imageSize, { width, height });
  context.drawImage(
    image,
    Math.floor(target.x),
    Math.floor(target.y),
    Math.floor(target.width),
    Math.floor(target.height),
  );
  if (isImageElement) {
    URL.revokeObjectURL(image.src);
  } else {
    image.close();
  }

  return context.getImageData(0, 0, width, height);
}
