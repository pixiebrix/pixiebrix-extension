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
import { render } from "react-dom";
import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { uuidv4 } from "@/types/helpers";

import theme from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import { browser } from "webextension-polyfill-ts";
import { registerForm } from "@/contentScript/modalForms";
import { expectContext } from "@/utils/expectContext";

export class ModalTransformer extends Transformer {
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
        additionalProperties: true,
      },
      uiSchema: {
        type: "object",
        additionalProperties: true,
      },
    },
    required: ["schema"],
  };

  async transform({ schema, uiSchema = {} }: BlockArg): Promise<unknown> {
    expectContext("contentScript");

    const container = document.createElement("div");
    const shadowRoot = container.attachShadow({ mode: "closed" });

    const nonce = uuidv4();
    const id = `modal-${nonce}`;

    const frameSrc = browser.runtime.getURL("modalForm.html");
    const src = `${frameSrc}?nonce=${encodeURIComponent(nonce)}`;

    console.debug("Show modal form", { src, schema, uiSchema });

    const formFrame = (
      // XXX: linking all of bootstrap here is overkill -- we just need the modal styles
      <React.Fragment>
        <link rel="stylesheet" href={theme} />
        <div className="modal-backdrop show" />
        <div className="modal show" style={{ display: "block" }}>
          {/* @ts-expect-error -- TypeScript doesn't know about allowtransparency */}
          <iframe
            src={src}
            id={id}
            frameBorder="0"
            title="Custom Form"
            allowtransparency="true"
          />
        </div>
      </React.Fragment>
    );

    document.body.append(container);
    render(formFrame, shadowRoot);

    let data;

    try {
      data = await registerForm(nonce, { schema, uiSchema });
    } finally {
      container.remove();
    }

    return data;
  }
}
