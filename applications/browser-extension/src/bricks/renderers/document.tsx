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

import React from "react";
import { RendererABC } from "../../types/bricks/rendererTypes";
import { validateRegistryId } from "../../types/helpers";
import {
  type BrickArgs,
  type BrickOptions,
  type ComponentRef,
} from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import {
  DOCUMENT_BUILDER_ELEMENT_TYPES,
  type DocumentBuilderElement,
} from "../../pageEditor/documentBuilder/documentBuilderTypes";
import IsolatedComponent from "../../components/IsolatedComponent";
import { type DocumentViewProps } from "./documentView/DocumentViewProps";

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
          enum: [...DOCUMENT_BUILDER_ELEMENT_TYPES],
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

const IsolatedDocumentView: React.FC<
  DocumentViewProps & { disableParentStyles: boolean }
> = ({ disableParentStyles, ...props }) => (
  <IsolatedComponent
    name="DocumentView"
    noStyle={disableParentStyles}
    lazy={async () =>
      import(
        /* webpackChunkName: "isolated/DocumentView" */
        "./documentView/DocumentView"
      )
    }
    factory={(DocumentView) => <DocumentView {...props} />}
    // It must fill the frame even if `noStyle` is set, so set it as a style prop
    // TODO: The parent node should instead make sure that the children fill
    // the sidebar vertically (via a simple `.d-flex`), but this this requires
    // verifying that other components aren't broken by this.
    style={{ height: "100%" }}
  />
);

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
      disableParentStyles = false,
    }: BrickArgs<{
      body: DocumentBuilderElement[];
      // Stylesheets array is validated to contain URIs in the brick input schema
      stylesheets: string[];
      disableParentStyles?: boolean;
    }>,
    options: BrickOptions,
  ): Promise<ComponentRef> {
    return {
      Component: IsolatedDocumentView,
      props: {
        body,
        stylesheets,
        options,
        disableParentStyles,
      },
    };
  }
}
