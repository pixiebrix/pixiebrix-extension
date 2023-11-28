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

import { type JsonObject } from "type-fest";
import {
  dataStore,
  performConfiguredRequestInBackground,
} from "@/background/messenger/api";
import notify from "@/utils/notify";
import { validateRegistryId } from "@/types/helpers";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { getPageState, setPageState } from "@/contentScript/messenger/api";
import { isEmpty, isPlainObject, set } from "lodash";
import { getTopLevelFrame } from "webext-messenger";
import { type UUID } from "@/types/stringTypes";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import {
  type Schema,
  SCHEMA_ALLOW_ANY,
  type UiSchema,
} from "@/types/schemaTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type ComponentRef,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { RendererABC } from "@/types/bricks/rendererTypes";
import { namespaceOptions } from "@/bricks/effects/pageState";
import { ensureJsonObject, isObject } from "@/utils/objectUtils";
import { getOutputReference, validateOutputKey } from "@/runtime/runtimeTypes";
import { type BrickConfig } from "@/bricks/types";
import { isExpression } from "@/utils/expressionUtils";

interface DatabaseResult {
  success: boolean;
  data: unknown;
}

export type StateStorage = {
  type: "state";
  namespace?: "extension" | "blueprint" | "shared";
};

export type Storage =
  | { type: "localStorage" }
  | {
      type: "database";
      databaseId: UUID;
      service: SanitizedIntegrationConfig;
    }
  | StateStorage;

function assertObject(value: unknown): asserts value is UnknownObject {
  if (!isObject(value)) {
    throw new BusinessError("Expected object for data");
  }
}

type Context = { blueprintId: RegistryId | null; extensionId: UUID };

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
              title: "Database",
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
              title: "Page State",
            },
            namespace: {
              type: "string",
              description:
                "The namespace for the state. If set to Mod and this Starter Brick is not part of a Mod, behaves as Public.",
              oneOf: namespaceOptions,
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
              // Deprecated because custom form is the only way to access the information
              title: "Local Storage (Deprecated)",
            },
          },
          required: ["type"],
        },
      ],
    },
    autoSave: {
      type: "boolean",
      description:
        "Toggle on to automatically save/submit the form on change. If enabled, form will not display a submit button.",
      default: false,
    },
    submitCaption: {
      type: "string",
      description: "The submit button caption (default='Submit')",
      default: "Submit",
    },
    onSubmit: {
      $ref: "https://app.pixiebrix.com/schemas/pipeline#",
      description: "Action to perform when the form is submitted",
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
    // Added in 1.7.33 to allow for adjusting the native margin/padding when used in the document builder
    className: {
      schema: { type: "string", format: "bootstrap-class" },
      label: "Layout/Style",
    },
  },
  required: ["schema"],
};

export class CustomFormRenderer extends RendererABC {
  static BLOCK_ID = validateRegistryId("@pixiebrix/form");

  static ON_SUBMIT_VARIABLE_NAME = validateOutputKey("values");

  constructor() {
    super(
      CustomFormRenderer.BLOCK_ID,
      "Custom Form",
      "Show a custom form connected to a data source"
    );
  }

  inputSchema: Schema = customFormRendererSchema as Schema;

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  override getPipelineVariableSchema(
    _config: BrickConfig,
    pipelineName: string
  ): Schema | undefined {
    if (pipelineName === "onSubmit") {
      if (
        isPlainObject(_config.config.schema) &&
        !isExpression(_config.config.schema)
      ) {
        return _config.config.schema;
      }

      return SCHEMA_ALLOW_ANY;
    }

    return super.getPipelineVariableSchema(_config, pipelineName);
  }

  async render(
    {
      storage = { type: "localStorage" },
      recordId,
      schema,
      uiSchema,
      autoSave = false,
      successMessage,
      submitCaption = "Submit",
      className,
      onSubmit,
    }: BrickArgs<{
      storage?: Storage;
      recordId?: string | null;
      schema: Schema;
      uiSchema?: UiSchema;
      className?: string;
      autoSave?: boolean;
      onSubmit?: PipelineExpression;
      submitCaption?: string;
      successMessage?: string;
    }>,
    { logger, runPipeline }: BrickOptions
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

    const { default: CustomFormComponent } = await import(
      /* webpackChunkName: "CustomFormComponent" */
      "./CustomFormComponent"
    );

    return {
      Component: CustomFormComponent,
      props: {
        recordId,
        formData: normalizedData,
        schema,
        uiSchema,
        autoSave,
        submitCaption,
        className,
        async onSubmit(
          values: JsonObject,
          { submissionCount }: { submissionCount: number }
        ) {
          try {
            const normalizedValues = normalizeOutgoingFormData(schema, values);

            // Note that we're running the onSubmit handler before setting the data. Given that we're passing the values
            // to the submit handler, the handler shouldn't be relying on the data being set yet.
            // This ordering also has more obvious behavior when the onSubmit handler throws an error (the data won't
            // be saved).
            if (onSubmit) {
              await runPipeline(
                onSubmit,
                {
                  key: "onSubmit",
                  counter: submissionCount,
                },
                {
                  [getOutputReference(
                    CustomFormRenderer.ON_SUBMIT_VARIABLE_NAME
                  )]: normalizedValues,
                }
              );
            }

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
      const topLevelFrame = await getTopLevelFrame();
      // Target the top level frame. Inline panels aren't generally available, so the renderer will always be in the
      // sidebar which runs in the context of the top-level frame
      return getPageState(topLevelFrame, {
        namespace,
        blueprintId,
        extensionId,
      });
    }

    case "database": {
      const {
        data: { data },
      } = await performConfiguredRequestInBackground<DatabaseResult>(
        storage.service,
        {
          url: `/api/databases/${
            storage.databaseId
          }/records/${encodeURIComponent(recordId)}/`,
          params: {
            missing_key: "blank",
          },
        }
      );
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
  const cleanValues = ensureJsonObject(values);

  switch (storage.type) {
    case "localStorage": {
      await dataStore.set(recordId, cleanValues);
      return;
    }

    case "database": {
      await performConfiguredRequestInBackground(storage.service, {
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
      const topLevelFrame = await getTopLevelFrame();
      // Target the top level frame. Inline panels aren't generally available, so the renderer will always be in the
      // sidebar which runs in the context of the top-level frame
      await setPageState(topLevelFrame, {
        namespace: storage.namespace ?? "blueprint",
        data: cleanValues,
        mergeStrategy: "shallow",
        extensionId,
        blueprintId,
      });
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

// Server can send null or undefined for an empty field.
// In order for RJSF to handle an absence of value properly,
// the field must not be present on the data object at all
// (not event undefined - this prevents setting the default value properly)
export function normalizeIncomingFormData(schema: Schema, data: UnknownObject) {
  const normalizedData: UnknownObject = {};
  for (const key of Object.keys(schema.properties)) {
    // eslint-disable-next-line security/detect-object-injection -- iterating over object keys
    const fieldValue = data[key];

    if (fieldValue != null) {
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
    if (normalizedData[key] === undefined) {
      normalizedData[key] = null;
    }
  }

  return normalizedData;
}
