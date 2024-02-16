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

import { browserAction } from "@/mv3/api";
import { assertNotNullish } from "@/utils/nullishUtils";
import axios from "axios";

export default async function activateBrowserActionIcon(url?: string) {
  const imageData = await loadImageData(url);

  if (imageData) {
    browserAction.setIcon({ imageData });
  } else {
    // This re-sets the colored manifest icons
    const { icons: path } = browser.runtime.getManifest();
    browserAction.setIcon({ path });
  }
}

/**
 * Converts a Blob object into ImageData.
 *
 * This function creates an Image object from a Blob, decodes the image,
 * draws it on an offscreen canvas, and then returns the image data from the canvas.
 */
export async function blobToImageData(
  blob: Blob,
  width: number,
  height: number,
): Promise<ImageData> {
  const imageBitmap = await createImageBitmap(blob);

  const context = new OffscreenCanvas(width, height).getContext("2d");
  assertNotNullish(context, "Failed to get 2D context for canvas"); // Impossible

  // Note: Images that are not square will be stretched to fit the canvas, unless
  // they're SVGs and the preserveAspectRatio attribute is set.
  // This could be implemented via https://github.com/fregante/intrinsic-scale
  context.drawImage(imageBitmap, 0, 0);
  return context.getImageData(0, 0, width, height);
}

export async function loadImageData(url?: string): Promise<ImageData | null> {
  if (!url) {
    return null;
  }

  try {
    const { data } = await axios.get<Blob>(url, { responseType: "blob" });
    return await blobToImageData(data, 32, 32);
  } catch (error) {
    console.warn("Failed to load image data for browser action icon.", {
      url,
      error,
    });
    return null;
  }
}
