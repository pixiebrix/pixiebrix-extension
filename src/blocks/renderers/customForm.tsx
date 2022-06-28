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

import React from "react";
import { Renderer, UnknownObject } from "@/types";
import {
  BlockArg,
  BlockOptions,
  ComponentRef,
  RegistryId,
  SanitizedServiceConfiguration,
  Schema,
  UiSchema,
  UUID,
} from "@/core";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { JsonObject } from "type-fest";
import { dataStore, proxyService, whoAmI } from "@/background/messenger/api";
import notify from "@/utils/notify";
import custom from "@/blocks/renderers/customForm.css?loadAsUrl";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
import ImageCropStylesheet from "@/blocks/renderers/ImageCropStylesheet";
// eslint-disable-next-line import/no-named-as-default -- need default export here
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import ErrorBoundary from "@/components/ErrorBoundary";
import { validateRegistryId } from "@/types/helpers";
import BootstrapStylesheet from "@/blocks/renderers/BootstrapStylesheet";
import { isObject } from "@/utils";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { getPageState, setPageState } from "@/contentScript/messenger/api";
import safeJsonStringify from "json-stringify-safe";
import { get, isEmpty, set } from "lodash";

const fields = {
  DescriptionField,
};
const uiWidgets = {
  imageCrop: ImageCropWidget,
};

export type Storage =
  | { type: "localStorage" }
  | {
      type: "database";
      databaseId: UUID;
      service: SanitizedServiceConfiguration;
    }
  | { type: "state"; namespace?: "extension" | "blueprint" | "shared" };

const CustomFormComponent: React.FunctionComponent<{
  schema: Schema;
  uiSchema: UiSchema;
  submitCaption: string;
  formData: JsonObject;
  onSubmit: (values: JsonObject) => Promise<void>;
}> = ({ schema, uiSchema, submitCaption, formData, onSubmit }) => (
  <div className="CustomForm p-3">
    <ErrorBoundary>
      <BootstrapStylesheet />
      <ImageCropStylesheet />
      <link rel="stylesheet" href={custom} />
      <JsonSchemaForm
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        fields={fields}
        widgets={uiWidgets}
        FieldTemplate={FieldTemplate}
        onSubmit={async ({ formData }) => {
          await onSubmit(formData);
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            {submitCaption}
          </button>
        </div>
      </JsonSchemaForm>
    </ErrorBoundary>
  </div>
);

function assertObject(value: unknown): asserts value is UnknownObject {
  if (!isObject(value)) {
    throw new BusinessError("Expected object for data");
  }
}

type Context = { blueprintId: RegistryId | null; extensionId: UUID };

async function getInitialData(
  storage: Storage,
  recordId: string,
  { blueprintId, extensionId }: Context
): Promise<UnknownObject> {
  switch (storage.type) {
    case "localStorage": {
      const data = await dataStore.get(recordId);
      assertObject(data);
      return data;
    }

    case "state": {
      const namespace = storage.namespace ?? "blueprint";
      const me = await whoAmI();
      // Target the top level frame. Inline panels aren't generally available, so the renderer will always be in the
      // sidebar which runs in the context of the top-level frame
      return getPageState(
        { tabId: me.tab.id, frameId: 0 },
        { namespace, blueprintId, extensionId }
      );
    }

    case "database": {
      const {
        data: { data },
      } = await proxyService(storage.service, {
        url: `/api/databases/${storage.databaseId}/records/${encodeURIComponent(
          recordId
        )}/`,
        params: {
          missing_key: "blank",
        },
      });
      assertObject(data);
      return data;
    }

    default: {
      throw new PropError(
        "Invalid storage type",
        CustomFormRenderer.BLOCK_ID,
        "storage",
        storage
      );
    }
  }
}

async function setData(
  storage: Storage,
  recordId: string,
  values: UnknownObject,
  { blueprintId, extensionId }: Context
): Promise<void> {
  const cleanValues = JSON.parse(safeJsonStringify(values));

  switch (storage.type) {
    case "localStorage": {
      await dataStore.set(recordId, cleanValues);
      return;
    }

    case "database": {
      await proxyService(storage.service, {
        url: `/api/databases/${storage.databaseId}/records/`,
        method: "put",
        data: {
          id: recordId,
          data: cleanValues,
          // Using shallow strategy to support partial data forms
          // In case when a form contains (and submits) only a subset of all the fields of a record,
          // the fields missing in the form will not be removed from the DB record
          merge_strategy: "shallow",
        },
      });
      return;
    }

    case "state": {
      const me = await whoAmI();
      // Target the top level frame. Inline panels aren't generally available, so the renderer will always be in the
      // sidebar which runs in the context of the top-level frame
      await setPageState(
        { tabId: me.tab.id, frameId: 0 },
        {
          namespace: storage.namespace ?? "blueprint",
          data: cleanValues,
          mergeStrategy: "shallow",
          extensionId,
          blueprintId,
        }
      );
      return;
    }

    default: {
      throw new PropError(
        "Invalid storage type",
        CustomFormRenderer.BLOCK_ID,
        "storage",
        storage
      );
    }
  }
}

export const customFormRendererSchema = {
  type: "object",
  properties: {
    storage: {
      oneOf: [
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              const: "database",
            },
            databaseId: {
              type: "string",
              format: "uuid",
            },
            service: {
              $ref: "https://app.pixiebrix.com/schemas/services/@pixiebrix/api",
            },
          },
          required: ["type", "service", "databaseId"],
        },
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              const: "state",
            },
            namespace: {
              type: "string",
              description:
                "The namespace for the storage, to avoid conflicts. If set to blueprint and the extension is not part of a blueprint, defaults to shared",
              enum: ["blueprint", "extension", "shared"],
              default: "blueprint",
            },
          },
          required: ["type"],
        },
        {
          type: "object",
          properties: {
            type: {
              type: "string",
              const: "localStorage",
            },
          },
          required: ["type"],
        },
      ],
    },
    submitCaption: {
      type: "string",
      description: "The submit button caption (default='Submit')",
      default: "Submit",
    },
    successMessage: {
      type: "string",
      default: "Successfully submitted form",
      description:
        "An optional message to display if the form submitted successfully",
    },
    recordId: {
      type: "string",
      description:
        "Unique identifier for the data record. Required if using a database or local storage",
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
  required: ["schema"],
};

// Ensure that all string fields contain string values (can be empty string "", but not null or undefined)
// so the form updates the displayed values of the input correctly
export function normalizeIncomingFormData(schema: Schema, data: UnknownObject) {
  const normalizedData: UnknownObject = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    const fieldValue = get(data, key);
    if (fieldValue == null) {
      if (
        typeof property === "object" &&
        property.type === "string" &&
        isEmpty(property.default)
      ) {
        set(normalizedData, key, "");
      }
    } else {
      set(normalizedData, key, fieldValue);
    }
  }

  return normalizedData;
}

// The server uses a shallow merge strategy that ignores undefined values,
// so we need to make all the undefined field values null instead, so that the server will clear those fields instead of ignoring them
export function normalizeOutgoingFormData(schema: Schema, data: UnknownObject) {
  const normalizedData = { ...data };
  for (const key of Object.keys(schema.properties)) {
    if (typeof normalizedData[key] === "undefined") {
      normalizedData[key] = null;
    }
  }

  return normalizedData;
}

export class CustomFormRenderer extends Renderer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/form");
  constructor() {
    super(
      CustomFormRenderer.BLOCK_ID,
      "Custom Form",
      "Show a custom form connected to a data source"
    );
  }

  inputSchema: Schema = customFormRendererSchema as Schema;

  async render(
    {
      storage = { type: "localStorage" },
      recordId,
      schema,
      uiSchema,
      successMessage = "Successfully submitted form",
      submitCaption = "Submit",
    }: BlockArg<{
      storage?: Storage;
      successMessage?: string;
      recordId?: string | null;
      submitCaption?: string;
      schema: Schema;
      uiSchema?: UiSchema;
    }>,
    { logger }: BlockOptions
  ): Promise<ComponentRef> {
    if (logger.context.extensionId == null) {
      throw new Error("extensionId is required");
    }

    if (
      isEmpty(recordId) &&
      ["database", "localStorage"].includes(storage.type)
    ) {
      throw new PropError(
        "recordId is required for database and localStorage",
        this.id,
        "recordId",
        recordId
      );
    }

    const { blueprintId, extensionId } = logger.context;

    const initialData = await getInitialData(storage, recordId, {
      blueprintId,
      extensionId,
    });

    const normalizedData = normalizeIncomingFormData(schema, initialData);

    console.debug("Initial data for form", {
      recordId,
      initialData,
      normalizedData,
    });

    return {
      Component: CustomFormComponent,
      props: {
        recordId,
        formData: normalizedData,
        schema,
        uiSchema,
        submitCaption,
        async onSubmit(values: JsonObject) {
          try {
            const normalizedValues = normalizeOutgoingFormData(schema, values);
            await setData(storage, recordId, normalizedValues, {
              blueprintId,
              extensionId,
            });
            if (!isEmpty(successMessage)) {
              notify.success(successMessage);
            }
          } catch (error) {
            notify.error({
              error,
              message: "Error submitting form",
              reportError: false,
            });
          }
        },
      },
    };
  }
}
