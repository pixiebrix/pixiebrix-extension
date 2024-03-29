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
    disableParentStyles: {
      type: "boolean",
      title: "Disable Parent Styling",
      description:
        "Disable the default/inherited styling for the rendered document. This will apply to nested bricks as well.",
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
      stylesheets = [],
      disableParentStyles,
    }: BrickArgs<{
      body: DocumentElement[];
      // Stylesheets array is validated to contain URIs in the brick input schema
      stylesheets: string[];
      disableParentStyles?: boolean;
    }>,
    options: BrickOptions,
  ): Promise<ComponentRef> {
    return {
      Component: DocumentViewLazy,
      props: {
        body,
        stylesheets,
        disableParentStyles,
        options,
      },
    };
  }
}
