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

import { Renderer } from "@/types";
import { BlockArg, BlockOptions, ComponentRef, Schema } from "@/core";
import DocumentViewLazy from "./documentView/DocumentViewLazy";

export class DocumentRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/document",
      "Render Document",
      "Render an interactive document"
    );
  }

  inputSchema: Schema = {
    properties: {
      body: {
        type: "object",
        description: "A document configuration",
        additionalProperties: true,
      },
    },
    required: ["body"],
  };

  async render(
    { body }: BlockArg,
    options: BlockOptions
  ): Promise<ComponentRef> {
    return {
      Component: DocumentViewLazy,
      props: {
        body,
        options,
      },
    };
  }
}
