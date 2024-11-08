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

import { EffectABC } from "@/types/bricks/effectTypes";
import type { BrickArgs } from "@/types/runtimeTypes";
import type { Schema } from "@/types/schemaTypes";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

/**
 * Brick to export a data URL as a file.
 * @since 1.8.14
 */
class ExportFileEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/export/file",
      "[Experimental] Export as File",
      "Export/download a data URL as a file",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      data: {
        type: "string",
        description:
          "A data URL: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs",
      },
      filename: {
        type: "string",
        description: "An optional filename, or exclude to generate",
      },
    },
    ["data"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // XXX: might introduce a "download" capability in the future, e.g., to support making the file as an artifact
    // from a headless platform run
    return ["dom"];
  }

  async effect({
    filename = "exported",
    data,
  }: BrickArgs<{
    filename?: string;
    data: string;
  }>): Promise<void> {
    const { default: download } = await import(
      /* webpackChunkName: "downloadjs" */ "downloadjs"
    );

    download(data, filename);
  }
}

export default ExportFileEffect;
