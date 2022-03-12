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

import { Reader } from "@/types";
import { Schema } from "@/core";

class ManifestReader extends Reader {
  defaultOutputKey = "manifest";

  constructor() {
    super(
      "@pixiebrix/chrome-extension-manifest",
      "Chrome manifest reader",
      "Read the Chrome extension manifest"
    );
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  async isAvailable() {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      manifest_version: {
        type: "integer",
      },
      name: {
        type: "string",
      },
      short_name: {
        type: "string",
      },
      minimum_chrome_version: {
        type: "string",
      },
      version: {
        type: "string",
      },
      description: {
        type: "string",
      },
    },
  };

  async read() {
    return chrome.runtime.getManifest();
  }
}

export default ManifestReader;
