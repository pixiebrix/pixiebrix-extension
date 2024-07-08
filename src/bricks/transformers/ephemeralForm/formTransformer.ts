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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { type BrickConfig } from "@/bricks/types";
import { type FormDefinition } from "@/platform/forms/formTypes";
import { isExpression } from "@/utils/expressionUtils";
import type { PlatformCapability } from "@/platform/capabilities";
import { mapMessageContextToModComponentRef } from "@/utils/modUtils";

export const TEMPORARY_FORM_SCHEMA: Schema = {
  type: "object",
  properties: {
    schema: {
      type: "object",
      description: "The JSON Schema for the form",
      additionalProperties: true,
    },
    uiSchema: {
      type: "object",
      description: "The react-jsonschema-form uiSchema for the form",
      additionalProperties: true,
    },
    cancelable: {
      type: "boolean",
      description: "Whether or not the user can cancel the form (default=true)",
      default: true,
    },
    submitCaption: {
      type: "string",
      description: "The submit button caption (default='Submit')",
      default: "Submit",
    },
    location: {
      type: "string",
      enum: ["modal", "sidebar"],
      description: "The location of the form (default='modal')",
      default: "modal",
    },
    stylesheets: {
      type: "array",
      items: {
        type: "string",
        format: "uri",
      },
      title: "CSS Stylesheet URLs",
      description:
        "Stylesheets will apply to the form in the order listed here",
    },
    disableParentStyles: {
      type: "boolean",
      title: "Disable Parent Styling",
      description:
        "Disable the default/inherited styling for the rendered form",
    },
  },
  required: ["schema"],
};

export class FormTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/form-modal");
  override defaultOutputKey = "form";

  constructor() {
    super(
      FormTransformer.BRICK_ID,
      "Show a modal or sidebar form",
      "Show a form as a modal or in the sidebar, and return the input",
    );
  }

  inputSchema = TEMPORARY_FORM_SCHEMA;

  override outputSchema: Schema = {
    type: "object",
    additionalProperties: true,
  };

  override getOutputSchema(config: BrickConfig): Schema | undefined {
    const formSchema = config.config?.schema as Schema;

    if (isExpression(formSchema)) {
      return this.outputSchema;
    }

    return formSchema ?? this.outputSchema;
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["form"];
  }

  async transform(
    {
      schema,
      uiSchema = {},
      cancelable = true,
      submitCaption = "Submit",
      location = "modal",
      stylesheets = [],
      disableParentStyles = false,
    }: BrickArgs<FormDefinition>,
    { logger, abortSignal, platform }: BrickOptions,
  ): Promise<unknown> {
    // Repackage the definition from the brick input with default values
    const formDefinition: FormDefinition = {
      schema,
      uiSchema,
      cancelable,
      submitCaption,
      location,
      stylesheets,
      disableParentStyles,
    };

    const controller = new AbortController();

    abortSignal?.addEventListener("abort", () => {
      controller.abort();
    });

    try {
      // `mapMessageContextToModComponentRef` throws if there's no mod component or starter brick in the context
      return await platform.form(
        formDefinition,
        controller,
        mapMessageContextToModComponentRef(logger.context),
      );
    } finally {
      controller.abort();
    }
  }
}
