/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import ReactDOM from "react-dom";
import Form from "@rjsf/core";
import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";
import { v4 as uuidv4 } from "uuid";
import { BusinessError, CancelError } from "@/errors";

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const theme = require("!!raw-loader!bootstrap/dist/css/bootstrap.min.css?esModule=false")
  .default;

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
      containerAttrs: {
        type: "object",
        additionalProperties: true,
      },
    },
    required: ["schema"],
  };

  async transform({
    schema,
    uiSchema = {},
    containerAttrs = {},
  }: BlockArg): Promise<object> {
    const container = document.createElement("div");
    const shadowRoot = container.attachShadow({ mode: "closed" });

    for (const [attr, value] of Object.entries(containerAttrs)) {
      if (value != null) {
        if (typeof value !== "string") {
          throw new BusinessError("Invalid containerAttr");
        }
        container.setAttribute(attr, value);
      }
    }

    document.body.append(container);

    const resultPromise = new Promise<object>((resolve, reject) => {
      const id = `modal-${uuidv4()}`;
      const form = (
        <React.Fragment>
          <style
            type="text/css"
            dangerouslySetInnerHTML={{ __html: theme.toString() }}
          />
          <div className="modal-backdrop show"></div>
          <div
            id={id}
            className="modal show"
            tabIndex={-1}
            role="dialog"
            style={{ display: "block", paddingRight: 15 }}
          >
            <div
              className="modal-dialog modal-dialog-scrollable"
              role="document"
            >
              <div className="modal-content">
                <div className="modal-body">
                  <Form
                    schema={schema}
                    uiSchema={uiSchema}
                    onSubmit={({ formData }) => {
                      resolve(formData as object);
                    }}
                  >
                    <div>
                      <button className="btn btn-primary" type="submit">
                        Submit
                      </button>
                      <button
                        className="btn btn-link"
                        type="button"
                        onClick={() =>
                          reject(new CancelError("You cancelled the form"))
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
      ReactDOM.render(form, shadowRoot);
      $(`#${id}`).on("hide.bs.modal", () =>
        reject(new CancelError("You cancelled the form"))
      );
    });

    let data;

    try {
      data = await resultPromise;
    } finally {
      container.remove();
    }

    return data;
  }
}

registerBlock(new ModalTransformer());
