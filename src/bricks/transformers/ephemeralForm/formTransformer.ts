/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { uuidv4, validateRegistryId } from "@/types/helpers";
import {
  cancelForm,
  registerForm,
} from "@/contentScript/ephemeralFormProtocol";
import { expectContext } from "@/utils/expectContext";
import {
  ensureSidebar,
  hideSidebarForm,
  HIDE_SIDEBAR_EVENT_NAME,
  showSidebarForm,
} from "@/contentScript/sidebarController";
import { showModal } from "@/bricks/transformers/ephemeralForm/modalUtils";
import { getThisFrame } from "webext-messenger";
import { type BrickConfig } from "@/bricks/types";
import { type FormDefinition } from "@/bricks/transformers/ephemeralForm/formTypes";
import { isExpression } from "@/utils/expressionUtils";

// The modes for createFrameSrc are different than the location argument for FormTransformer. The mode for the frame
// just determines the layout container of the form
type Mode = "modal" | "panel";

export async function createFrameSource(
  nonce: string,
  mode: Mode,
): Promise<URL> {
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("ephemeralForm.html"));
  frameSource.searchParams.set("nonce", nonce);
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", mode);
  return frameSource;
}

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

  inputSchema: Schema = {
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
        description:
          "Whether or not the user can cancel the form (default=true)",
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
    },
    required: ["schema"],
  };

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

  async transform(
    {
      schema,
      uiSchema = {},
      cancelable = true,
      submitCaption = "Submit",
      location = "modal",
    }: BrickArgs<FormDefinition>,
    { logger, abortSignal }: BrickOptions,
  ): Promise<unknown> {
    expectContext("contentScript");

    // Future improvements:
    // - Support draggable modals. This will require showing the modal header on the host page so there's a drag handle?

    const formNonce = uuidv4();

    const formDefinition = {
      schema,
      uiSchema,
      cancelable,
      submitCaption,
      location,
    };

    abortSignal?.addEventListener("abort", () => {
      void cancelForm(formNonce);
    });

    const controller = new AbortController();

    // Register form before adding modal or sidebar to avoid race condition in retrieving the form definition.
    // Pre-registering the form also allows the sidebar to know a form will be shown in computing the default
    // tab to show during sidebar initialization.
    const formPromise = registerForm({
      extensionId: logger.context.extensionId,
      nonce: formNonce,
      definition: formDefinition,
      blueprintId: logger.context.blueprintId,
    });

    if (location === "sidebar") {
      // Ensure the sidebar is visible (which may also be showing persistent panels)
      await ensureSidebar();

      showSidebarForm({
        extensionId: logger.context.extensionId,
        blueprintId: logger.context.blueprintId,
        nonce: formNonce,
        form: formDefinition,
      });

      // Two-way binding between sidebar and form. Listen for the user (or an action) closing the sidebar
      window.addEventListener(
        HIDE_SIDEBAR_EVENT_NAME,
        () => {
          controller.abort();
        },
        {
          // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
          // The listener will be removed when the given AbortSignal object's abort() method is called.
          signal: controller.signal,
        },
      );

      controller.signal.addEventListener("abort", () => {
        // NOTE: we're not hiding the side panel here to avoid closing the sidebar if the user already had it open.
        // In the future we might creating/sending a closeIfEmpty message to the sidebar, so that it would close
        // if this form was the only entry in the panel
        hideSidebarForm(formNonce);
        void cancelForm(formNonce);
      });
    } else {
      const frameSource = await createFrameSource(formNonce, location);

      showModal({ url: frameSource, controller });
    }

    try {
      return await formPromise;
    } finally {
      controller.abort();
    }
  }
}
