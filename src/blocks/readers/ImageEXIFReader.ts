/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { registerBlock } from "@/blocks/registry";
import { Reader } from "@/types";
import { Schema } from "@/core";
import axios from "axios";
import * as ExifReader from "exifreader";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // adapted from https://github.com/exif-js/exif-js/blob/master/exif.js#L343
  base64 = base64.replace(/^data:([^;]+);base64,/gim, "");
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function getData(img: HTMLImageElement): Promise<ArrayBuffer> {
  // adapted from https://github.com/exif-js/exif-js/blob/master/exif.js#L384
  if (/^data:/i.test(img.src)) {
    // Data URI
    return base64ToArrayBuffer(img.src);
  }
  if (/^blob:/i.test(img.src)) {
    // Object URL
    const blob = await fetch(img.src).then((r) => r.blob());
    return await blob.arrayBuffer();
  }
  const response = await axios.get(img.src, { responseType: "arraybuffer" });
  if (response.status !== 200) {
    throw new Error(`Error fetching image ${img.src}: ${response.statusText}`);
  }
  return response.data;
}

class ImageEXIFReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/image/exif",
      "Image EXIF reader",
      "Read EXIF information from an image element. For remote images, makes an additional request for the image."
    );
  }

  async read(elementOrDocument: HTMLElement | Document) {
    const element = elementOrDocument as HTMLImageElement;

    if (element?.tagName == "IMG") {
      const buffer = await getData(element);
      return ExifReader.load(buffer);
    }
    throw new Error(
      `Expected an image element, got ${element.tagName ?? "document"}`
    );
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {},
    additionalProperties: true,
  };

  async isAvailable() {
    return true;
  }
}

registerBlock(new ImageEXIFReader());
