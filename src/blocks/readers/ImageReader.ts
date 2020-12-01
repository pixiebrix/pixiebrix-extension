/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { registerBlock } from "@/blocks/registry";
import { Reader } from "@/types";
import { Schema } from "@/core";

/**
 * Copied from https://stackoverflow.com/questions/934012/get-image-data-url-in-javascript
 */
function getBase64Image(img: HTMLImageElement) {
  // Create an empty canvas element
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Copy the image contents to the canvas
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Get the data-URL formatted image
  // Firefox supports PNG and JPEG. You could check img.src to
  // guess the original format, but be aware the using "image/jpg"
  // will re-encode the image.
  const dataURL = canvas.toDataURL("image/png");

  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

class ImageReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/image",
      "Image reader",
      "Read base64 encoding of the image from an image (img) tag"
    );
  }

  async read(elementOrDocument: HTMLElement | Document) {
    const element = elementOrDocument as HTMLImageElement;

    if (element?.tagName == "IMG") {
      return {
        img: getBase64Image(element as HTMLImageElement),
      };
    } else {
      throw new Error(
        `Expected an image, got ${element.tagName ?? "document"}`
      );
    }
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      img: {
        type: "string",
        // https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data
        pattern:
          "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$",
      },
    },
    required: ["img"],
    additionalProperties: false,
  };

  async isAvailable() {
    return true;
  }
}

registerBlock(new ImageReader());
