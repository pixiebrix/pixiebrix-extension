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

import { COMPONENT_READER_ID } from "@/bricks/transformers/component/ComponentReader";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { type BrickConfig } from "@/bricks/types";
import { uuidv4 } from "@/types/helpers";
import { defaultBrickConfig } from "@/bricks/util";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";
import { JavaScriptTransformer } from "@/bricks/transformers/javascript";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import { minimalUiSchemaFactory } from "@/utils/schemaUtils";
import { toExpression } from "@/utils/expressionUtils";
import CommentEffect from "@/bricks/effects/comment";
import AddDynamicTextSnippet from "@/bricks/effects/AddDynamicTextSnippet";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import AddTextSnippets from "@/bricks/effects/AddTextSnippets";

import { MergeStrategies, StateNamespaces } from "@/platform/state/stateTypes";
import IfElse from "@/bricks/transformers/controlFlow/IfElse";
import AssignModVariable from "@/bricks/effects/assignModVariable";

/**
 * Get an example brick config for a given brick id.
 * @param brickId the block id to add
 * @param parentBrickId the parent brick id, or null if in the root pipeline
 * @internal
 */
export function getExampleBrickConfig(
  brickId: RegistryId,
  { parentBrickId }: { parentBrickId?: RegistryId } = {},
): BrickConfig["config"] | null {
  switch (brickId) {
    case CommentEffect.BRICK_ID: {
      return {
        comment: "",
      };
    }

    case COMPONENT_READER_ID: {
      return {
        selector: "",
        optional: false,
      };
    }

    case "@pixiebrix/jquery-reader": {
      return {
        selectors: {
          property: {
            selector: "",
            isMulti: false,
          },
        },
      };
    }

    case IdentityTransformer.BRICK_ID: {
      return {
        // Use `property` as the default because the property table has title "Property name"
        property: toExpression("nunjucks", ""),
      };
    }

    case FormTransformer.BRICK_ID: {
      return {
        schema: {
          title: "Example Form",
          type: "object",
          properties: {
            example: {
              title: "Example Field",
              type: "string",
              description: "An example form field",
            },
          },
        },
        uiSchema: minimalUiSchemaFactory(),
        cancelable: true,
        submitCaption: "Submit",
        location: "modal",
      };
    }

    case CustomFormRenderer.BRICK_ID: {
      return {
        storage: {
          type: "state",
          namespace: StateNamespaces.MOD,
        },
        submitCaption: "Submit",
        successMessage: "Successfully submitted form",
        schema: {
          title: "Example Form",
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
      };
    }

    case "@pixiebrix/document": {
      if (parentBrickId === "@pixiebrix/tour/step") {
        // Single row with text markdown
        const containerElement = createNewDocumentBuilderElement("container");

        // Adding text to the second row
        const textElement = createNewDocumentBuilderElement("text");
        textElement.config.text =
          "Example step content. **Markdown** is supported.";

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know this is safe
        containerElement.children![0]!.children![0]!.children!.push(
          textElement,
        );

        return {
          body: [containerElement],
        };
      }

      // Creating container with 2 rows and 1 column in each row
      const containerElement = createNewDocumentBuilderElement("container");
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know this is safe
      containerElement.children!.push(createNewDocumentBuilderElement("row"));

      // Adding Header to the first row
      const headerElement = createNewDocumentBuilderElement("header");
      headerElement.config.title = "Example document";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know this is safe
      containerElement.children![0]!.children![0]!.children!.push(
        headerElement,
      );

      // Adding text to the second row
      const textElement = createNewDocumentBuilderElement("text");
      textElement.config.text =
        "Example text element. **Markdown** is supported.";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know this is safe
      containerElement.children![1]!.children![0]!.children!.push(textElement);

      return {
        body: [containerElement],
      };
    }

    case "@pixiebrix/forms/set": {
      return {
        isRootAware: true,
        inputs: [{ selector: null, value: "" }],
      };
    }

    case "@pixiebrix/state/set": {
      return {
        namespace: StateNamespaces.MOD,
        mergeStrategy: MergeStrategies.SHALLOW,
        data: {},
      };
    }

    case "@pixiebrix/state/get": {
      return {
        namespace: StateNamespaces.MOD,
      };
    }

    case AssignModVariable.BRICK_ID: {
      return {
        variableName: toExpression("nunjucks", ""),
        value: toExpression("nunjucks", ""),
      };
    }

    case AddTextSnippets.BRICK_ID: {
      return {
        snippets: [
          {
            shortcut: "example",
            title: "Example Snippet",
            text: "Example snippet text",
          },
        ],
      };
    }

    case AddDynamicTextSnippet.BRICK_ID: {
      return {
        shortcut: "command",
        title: "Example Dynamic Snippet",
        generate: toExpression("pipeline", [
          {
            ...createNewConfiguredBrick(IdentityTransformer.BRICK_ID, {
              parentBrickId: AddDynamicTextSnippet.BRICK_ID,
            }),
            config: toExpression("nunjucks", ""),
            outputKey: validateOutputKey("generatedText"),
          },
        ]),
      };
    }

    case DisplayTemporaryInfo.BRICK_ID: {
      return {
        title: "Example Info",
        location: "panel",
        body: toExpression("pipeline", [
          createNewConfiguredBrick(DocumentRenderer.BRICK_ID),
        ]),
        isRootAware: true,
      };
    }

    case JavaScriptTransformer.BRICK_ID: {
      return {
        function: `function (args) {
  const { x } = args;
  return x;
}`,
        arguments: { x: "Hello from PixieBrix!" },
      };
    }

    case IfElse.BRICK_ID: {
      return {
        // `condition` is not required, default to empty string so it's not excluded
        condition: toExpression("nunjucks", ""),
        if: toExpression("pipeline", []),
        else: toExpression("pipeline", []),
      };
    }

    default: {
      return null;
    }
  }
}

/**
 * Returns a new BrickConfig for a given brick id.
 * @param brickId the brick registry
 * @param parentBrickId optional parent brick id. Some example configs vary depending on root vs. nested usage
 * @param brickInputSchema the brick input schema, for defaulting the brick configuration
 */
export function createNewConfiguredBrick(
  brickId: RegistryId,
  {
    parentBrickId,
    brickInputSchema,
  }: { parentBrickId?: RegistryId; brickInputSchema?: Schema } = {},
): BrickConfig {
  return {
    id: brickId,
    // Operating within the Page Editor, so include an instanceId
    instanceId: uuidv4(),
    // @since 1.7.16 -- use "document" as the default root mode because it's the easiest to understand
    rootMode: "document",
    config:
      getExampleBrickConfig(brickId, { parentBrickId }) ??
      (brickInputSchema == null ? {} : defaultBrickConfig(brickInputSchema)),
  };
}
