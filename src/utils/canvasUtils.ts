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

async function loadAsBlob(url: string): Promise<Blob> {
  const response = await axios.get<Blob>(url, { responseType: "blob" });
  return response.data;
}

function getSvgProxyUrl(url: string): string {
  return `https://svg-to-png.mrproper.dev/${url}`;
}

export async function loadImageData(
  url: string,
  width: number,
  height: number,
): Promise<ImageData> {
  // Try to detect SVG files via URL
  if (new URL(url).pathname.endsWith(".svg")) {
    url = getSvgProxyUrl(url);
  }

  let blob = await loadAsBlob(url);

  if (blob.type === "image/svg+xml") {
    // The URL check failed, fetch again, using the proxy this time
    url = getSvgProxyUrl(url);
    blob = await loadAsBlob(url);
  }

  return blobToImageData(blob, width, height);
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
  const image = await createImageBitmap(blob);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- 2d always exists
  const context = new OffscreenCanvas(width, height).getContext("2d")!;

  // Preserve aspect ratio (width/height) and center it (x/y)
  const target = resizeToFit("contain", image, { width, height });
  context.drawImage(
    image,
    Math.floor(target.x),
    Math.floor(target.y),
    Math.floor(target.width),
    Math.floor(target.height),
  );

  image.close();

  return context.getImageData(0, 0, width, height);
}
