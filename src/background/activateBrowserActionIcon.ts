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
import axios from "axios";

export default async function activateBrowserActionIcon(url?: string) {
  const imageData = await getImageData();

  if (imageData) {
    browserAction.setIcon({ imageData });
  } else {
    // This re-sets the colored manifest icons
    const { icons: path } = browser.runtime.getManifest();
    browserAction.setIcon({ path });
  }
}

export async function blobToImageData(blob: Blob): Promise<ImageData> {
  // TODO: Add MV3 support: https://github.com/pixiebrix/pixiebrix-extension/issues/7622

  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();

  // Paint on canvas and return
  const canvas = new OffscreenCanvas(16, 16);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to get 2d context for canvas");
  }

  context.drawImage(img, 0, 0);
  return context.getImageData(0, 0, 16, 16);
}

export async function getImageData(url?: string): Promise<ImageData | null> {
  if (!url) {
    return null;
  }

  try {
    const { data } = await axios.get<Blob>(url, { responseType: "blob" });

    return await blobToImageData(data);
  } catch (error) {
    console.warn("Failed to load image data for browser action icon.", {
      url,
      error,
    });
    return null;
  }
}
