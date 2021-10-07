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

import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { browser } from "webextension-polyfill-ts";
import { registerForm } from "@/contentScript/modalForms";
import { expectContext } from "@/utils/expectContext";
import { whoAmI } from "@/background/messenger/api";

function ModalFrame({ src = "" }) {
  return (
    <dialog
      ref={(dialog) => dialog.showModal()}
      style={{
        border: 0,
        width: "500px",
        height: "100vh", // TODO: Replace with frame auto-sizer via messaging
        display: "flex", // Fit iframe inside
        background: "none",
      }}
    >
      <iframe
        src={src}
        style={{
          border: "0",
          flexGrow: 1, // Fit dialog
        }}
      />
    </dialog>
  );
}

export class ModalTransformer extends Transformer {
  defaultOutputKey = "form";

  constructor() {
    super(
      "@pixiebrix/form-modal",
      "Show a modal form",
      "Show a modal form and return the input",
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
    },
    required: ["schema"],
  };

  async transform({
    schema,
    uiSchema = {},
    cancelable = true,
    submitCaption = "Submit",
  }: BlockArg): Promise<unknown> {
    expectContext("contentScript");

    // Future improvements:
    // - Support draggable modals. This will require showing the modal header on the host page so there's a drag handle?

    const nonce = uuidv4();
    const { tab, frameId } = await whoAmI();

    const frameSrc = new URL(browser.runtime.getURL("modalForm.html"));
    frameSrc.searchParams.set("nonce", nonce);
    frameSrc.searchParams.set(
      "opener",
      JSON.stringify({ tabId: tab.id, frameId: frameId })
    );

    // Using `<style>` will avoid overriding the site’s inline styles
    const style = document.createElement("style");

    const scrollableRoot =
      window.getComputedStyle(document.body).overflowY === "scroll"
        ? "body"
        : "html";
    style.textContent += `${scrollableRoot} {overflow: hidden !important}`; // Disable scrollbar

    // Preserve space initially taken by scrollbar
    const scrollbarWidth = window.innerWidth - document.body.clientWidth;
    style.textContent += `html {padding-inline-end: ${scrollbarWidth}px  !important}`;

    const container = document.createElement("div");
    const shadowRoot = container.attachShadow({ mode: "closed" });
    document.body.append(container, style);
    render(<ModalFrame src={String(frameSrc)} />, shadowRoot);

    try {
      return await registerForm(nonce, {
        schema,
        uiSchema,
        cancelable,
        submitCaption,
      });
    } finally {
      unmountComponentAtNode(container);
      style.remove();
      container.remove();
    }
  }
}
