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

import { RendererABC } from "@/types/bricks/rendererTypes";
import DocumentViewLazy from "./documentView/DocumentViewLazy";
import { validateRegistryId } from "@/types/helpers";
import {
  type BrickArgs,
  type BrickOptions,
  type ComponentRef,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  DOCUMENT_ELEMENT_TYPES,
  type DocumentElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import { compact } from "lodash";
import { isValidUrl } from "@/utils/urlUtils";
import { BusinessError } from "@/errors/businessErrors";

export const DOCUMENT_SCHEMA: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
    body: {
      type: "array",
      description: "A list of document element configurations",
      items: {
        $ref: "#/definitions/element",
      },
    },
    stylesheets: {
      type: "array",
      items: {
        type: "string",
        format: "uri",
      },
      title: "CSS Stylesheet URLs",
      description:
        "Stylesheets will apply to the rendered document in the order listed here",
    },
  },
  required: ["body"],
  definitions: {
    element: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [...DOCUMENT_ELEMENT_TYPES],
        },
        config: {
          type: "object",
          additionalProperties: true,
        },
        children: {
          type: "array",
          items: {
            $ref: "#/definitions/element",
          },
        },
      },
      required: ["type", "config"],
    },
  },
};

export class DocumentRenderer extends RendererABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/document");
  constructor() {
    super(
      DocumentRenderer.BRICK_ID,
      "Render Document",
      "Render an interactive document",
    );
  }

  inputSchema = DOCUMENT_SCHEMA;

  async render(
    {
      body,
      stylesheets: _stylesheets = [],
    }: BrickArgs<{
      body: DocumentElement[];
      // Stylesheets is validated to contain URIs in the brick input schema
      stylesheets: string[];
    }>,
    options: BrickOptions,
  ): Promise<ComponentRef> {
    const stylesheets = compact(_stylesheets);
    for (const url of stylesheets) {
      if (!isValidUrl(url)) {
        throw new BusinessError(`Invalid Stylesheet URL: ${url}`);
      }
    }

    return {
      Component: DocumentViewLazy,
      props: {
        body,
        stylesheets,
        options,
      },
    };
  }
}
