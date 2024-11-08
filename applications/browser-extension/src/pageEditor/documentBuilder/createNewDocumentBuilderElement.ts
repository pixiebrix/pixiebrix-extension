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

import {
  type DocumentBuilderElement,
  type DocumentBuilderElementType,
} from "./documentBuilderTypes";
import { uuidv4, validateRegistryId } from "../../types/helpers";
import { type DeferExpression } from "../../types/runtimeTypes";
import { toExpression } from "../../utils/expressionUtils";

import { StateNamespaces } from "../../platform/state/stateTypes";

const documentBuilderElementExtras: Record<"form", DocumentBuilderElementType> =
  {
    form: "pipeline",
  };

export function createNewDocumentBuilderElement(
  documentBuilderElementType:
    | DocumentBuilderElementType
    | keyof typeof documentBuilderElementExtras,
): DocumentBuilderElement {
  const documentBuilderElement: DocumentBuilderElement = {
    // Writing as map to make it easier to add similar shortcuts in the future

    type:
      documentBuilderElementType === "form"
        ? documentBuilderElementExtras[documentBuilderElementType]
        : documentBuilderElementType,
    config: {},
  };

  switch (documentBuilderElementType) {
    case "header": {
      documentBuilderElement.config.title = "Header";
      documentBuilderElement.config.heading = "h1";
      break;
    }

    case "text": {
      documentBuilderElement.config.text =
        "Paragraph text. **Markdown** is supported.";
      documentBuilderElement.config.enableMarkdown = true;
      break;
    }

    case "image": {
      documentBuilderElement.config.url = null;
      break;
    }

    case "container": {
      documentBuilderElement.children = [
        createNewDocumentBuilderElement("row"),
      ];
      break;
    }

    case "row": {
      documentBuilderElement.children = [
        createNewDocumentBuilderElement("column"),
      ];
      break;
    }

    case "column": {
      documentBuilderElement.children = [];
      break;
    }

    case "card": {
      documentBuilderElement.config.heading = "Header";
      documentBuilderElement.children = [];
      break;
    }

    case "form": {
      documentBuilderElement.config.label = "Form";
      documentBuilderElement.config.pipeline = toExpression("pipeline", [
        {
          id: validateRegistryId("@pixiebrix/form"),
          // Assign instanceId. All bricks in Page Editor are expected to have a unique
          // instanceId because they're used as the React key and for correlating traces
          instanceId: uuidv4(),
          config: {
            storage: {
              type: "state",
              namespace: StateNamespaces.MOD,
            },
            submitCaption: "Save",
            schema: {
              type: "object",
              properties: {
                notes: {
                  title: "Example Notes Field",
                  type: "string",
                  description: "An example notes field",
                },
              },
            },
            uiSchema: {
              notes: {
                "ui:widget": "textarea",
              },
            },
            className: "p-0",
          },
        },
      ]);
      break;
    }

    case "pipeline": {
      documentBuilderElement.config.label = "Brick";
      documentBuilderElement.config.pipeline = toExpression("pipeline", []);
      break;
    }

    case "button": {
      documentBuilderElement.config.label = "Button";
      documentBuilderElement.config.title = "Action";
      documentBuilderElement.config.size = "md";
      documentBuilderElement.config.variant = "primary";
      documentBuilderElement.config.fullWidth = false;
      documentBuilderElement.config.disabled = false;
      documentBuilderElement.config.hidden = false;

      documentBuilderElement.config.onClick = toExpression("pipeline", []);

      break;
    }

    case "list": {
      // ListElement uses "element" as the default. But be explicit
      documentBuilderElement.config.elementKey = "element";

      documentBuilderElement.config.element = toExpression(
        "defer",
        createNewDocumentBuilderElement("text"),
      ) as DeferExpression<DocumentBuilderElement>;
      break;
    }

    default: {
      throw new Error(
        `Can't create new document builder element. Type "${documentBuilderElementType} is not supported.`,
      );
    }
  }

  return documentBuilderElement;
}
