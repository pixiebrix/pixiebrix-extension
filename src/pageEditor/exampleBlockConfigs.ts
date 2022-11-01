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

import { UnknownObject } from "@/types";
import { RegistryId, Schema } from "@/core";
import { COMPONENT_READER_ID } from "@/blocks/transformers/component/ComponentReader";
import { FormTransformer } from "@/blocks/transformers/ephemeralForm/formTransformer";
import { CustomFormRenderer } from "@/blocks/renderers/customForm";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import DisplayTemporaryInfo from "@/blocks/transformers/temporaryInfo/DisplayTemporaryInfo";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { makePipelineExpression } from "@/runtime/expressionCreators";
import { BlockConfig } from "@/blocks/types";
import { uuidv4 } from "@/types/helpers";
import { defaultBlockConfig } from "@/blocks/util";

export function getExampleBlockConfig(
  blockId: RegistryId
): UnknownObject | null {
  if (blockId === COMPONENT_READER_ID) {
    return {
      selector: "",
      optional: false,
    };
  }

  if (blockId === "@pixiebrix/jquery-reader") {
    return {
      selectors: {
        property: "",
      },
    };
  }

  if (blockId === FormTransformer.BLOCK_ID) {
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
      uiSchema: {},
      cancelable: true,
      submitCaption: "Submit",
      location: "modal",
    };
  }

  if (blockId === CustomFormRenderer.BLOCK_ID) {
    return {
      storage: {
        type: "state",
        namespace: "blueprint",
      },
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

  if (blockId === "@pixiebrix/document") {
    // Creating container with 2 rows and 1 column in each row
    const container = createNewElement("container");
    container.children.push(createNewElement("row"));

    // Adding Header to the first row
    const header = createNewElement("header");
    header.config.title = "Example document";
    container.children[0].children[0].children.push(header);

    // Adding text to the second row
    const text = createNewElement("text");
    text.config.text = "Example text element. **Markdown** is supported.";
    text.config.className = "text-success";
    container.children[1].children[0].children.push(text);

    return {
      body: [container],
    };
  }

  if (blockId === DisplayTemporaryInfo.BLOCK_ID) {
    return {
      title: "Example Info",
      body: makePipelineExpression([createNewBlock(DocumentRenderer.BLOCK_ID)]),
    };
  }
}

export function createNewBlock(
  blockId: RegistryId,
  blockInputSchema?: Schema
): BlockConfig {
  return {
    id: blockId,
    instanceId: uuidv4(),
    config:
      getExampleBlockConfig(blockId) ??
      (blockInputSchema == null ? {} : defaultBlockConfig(blockInputSchema)),
  };
}
