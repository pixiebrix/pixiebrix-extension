/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Transformer } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { uuidv4 } from "@/types/helpers";
import browser from "webextension-polyfill";
import {
  cancelForm,
  registerForm,
} from "@/contentScript/ephemeralFormProtocol";
import { expectContext } from "@/utils/expectContext";
import { whoAmI } from "@/background/messenger/api";
import {
  ensureActionPanel,
  hideActionPanelForm,
  PANEL_HIDING_EVENT,
  showActionPanelForm,
} from "@/actionPanel/native";
import { showModal } from "@/blocks/transformers/ephemeralForm/modalUtils";
import { reportError } from "@/telemetry/logging";

// The modes for createFrameSrc are different than the location argument for FormTransformer. The mode for the frame
// just determines the layout container of the form
type Mode = "modal" | "panel";

export async function createFrameSource(
  nonce: string,
  mode: Mode
): Promise<URL> {
  const { tab, frameId } = await whoAmI();

  const frameSource = new URL(browser.runtime.getURL("ephemeralForm.html"));
  frameSource.searchParams.set("nonce", nonce);
  frameSource.searchParams.set(
    "opener",
    JSON.stringify({ tabId: tab.id, frameId })
  );
  frameSource.searchParams.set("mode", mode);
  return frameSource;
}

export class FormTransformer extends Transformer {
  defaultOutputKey = "form";

  constructor() {
    super(
      "@pixiebrix/form-modal",
      "Show a modal or sidebar form",
      "Show a form as a modal or in the sidebar, and return the input",
      "faCode"
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

  async transform(
    {
      schema,
      uiSchema = {},
      cancelable = true,
      submitCaption = "Submit",
      location = "modal",
    }: BlockArg,
    { logger }: BlockOptions
  ): Promise<unknown> {
    expectContext("contentScript");

    // Future improvements:
    // - Support draggable modals. This will require showing the modal header on the host page so there's a drag handle?

    const frameNonce = uuidv4();
    const frameSource = await createFrameSource(frameNonce, location);

    const formDefinition = {
      schema,
      uiSchema,
      cancelable,
      submitCaption,
    };

    const controller = new AbortController();

    if (location === "sidebar") {
      // Show sidebar (which may also be showing native panels)

      await ensureActionPanel();

      showActionPanelForm({
        extensionId: logger.context.extensionId,
        nonce: frameNonce,
        form: formDefinition,
      });

      // Two-way binding between sidebar and form. Listen for the user (or an action) closing the sidebar
      window.addEventListener(
        PANEL_HIDING_EVENT,
        () => {
          controller.abort();
        },
        {
          // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
          // The listener will be removed when the given AbortSignal object's abort() method is called.
          signal: controller.signal,
        }
      );

      controller.signal.addEventListener("abort", () => {
        // NOTE: we're not hiding the side panel here to avoid closing the sidebar if the user already had it open.
        // In the future we might creating/sending a closeIfEmpty message to the sidebar, so that it would close
        // if this form was the only entry in the panel
        hideActionPanelForm(frameNonce);
        void cancelForm(frameNonce).catch(reportError);
      });
    } else {
      showModal(frameSource, controller.signal);
    }

    try {
      return await registerForm(frameNonce, formDefinition);
    } finally {
      controller.abort();
    }
  }
}
