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
import { Renderer } from "@/types";
import { BlockArg, BlockOptions, RenderedHTML, Schema, UiSchema } from "@/core";
import { registerBlock } from "@/blocks/registry";
import Form from "@rjsf/core";
import { JsonObject } from "type-fest";
import { getRecord, setRecord } from "@/background/dataStore";
import { reportError } from "@/telemetry/logging";
import { notifyResult } from "@/contentScript/notify";

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const theme = require("!!raw-loader!bootstrap/dist/css/bootstrap.min.css?esModule=false")
  .default;

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const custom = require("!!raw-loader!@/blocks/renderers/customForm.css?esModule=false")
  .default;

const CustomFormComponent: React.FunctionComponent<{
  schema: Schema;
  uiSchema: UiSchema;
  formData: JsonObject;
  onSubmit: (values: JsonObject) => Promise<void>;
}> = ({ schema, uiSchema, formData, onSubmit }) => {
  return (
    <div className="CustomForm">
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: theme.toString() }}
      />
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: custom.toString() }}
      />
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        onSubmit={async ({ formData }) => {
          await onSubmit(formData);
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </div>
      </Form>
    </div>
  );
};

export class CustomForm extends Renderer {
  constructor() {
    super(
      "@pixiebrix/form",
      "Custom Form",
      "Show a custom form connected to a data source"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      recordId: {
        type: "string",
        description: "Unique identifier for the data record",
      },
      schema: {
        type: "object",
        additionalProperties: true,
      },
      uiSchema: {
        type: "object",
        additionalProperties: true,
      },
    },
  };

  async render(
    { recordId, schema, uiSchema }: BlockArg,
    { logger }: BlockOptions
  ): Promise<RenderedHTML> {
    const formData = await getRecord(recordId);

    console.debug(`Building panel for record: [[ ${recordId} ]]`);

    return {
      Component: CustomFormComponent,
      props: {
        recordId,
        formData,
        schema,
        uiSchema,
        onSubmit: async (values: JsonObject) => {
          try {
            await setRecord(recordId, values);
            notifyResult(logger.context.extensionId, {
              message: "Saved record",
              config: {
                className: "success",
              },
            });
          } catch (error) {
            reportError(error);
            notifyResult(logger.context.extensionId, {
              message: "Error saving record",
              config: {
                className: "error",
              },
            });
          }
        },
      },
    } as any;
  }
}

registerBlock(new CustomForm());
