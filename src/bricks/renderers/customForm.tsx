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

import React from "react";
import { type JsonObject } from "type-fest";
import { validateRegistryId } from "@/types/helpers";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { getPageState, setPageState } from "@/contentScript/messenger/api";
import { isEmpty, isPlainObject, set } from "lodash";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { type UUID } from "@/types/stringTypes";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import {
  type Schema,
  SCHEMA_ALLOW_ANY,
  type UiSchema,
} from "@/types/schemaTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type ComponentRef,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { RendererABC } from "@/types/bricks/rendererTypes";
import { namespaceOptions } from "@/bricks/effects/pageState";
import { assertObject, ensureJsonObject } from "@/utils/objectUtils";
import { getOutputReference, validateOutputKey } from "@/runtime/runtimeTypes";
import { type BrickConfig } from "@/bricks/types";
import { isExpression } from "@/utils/expressionUtils";
import { getPlatform } from "@/platform/platformContext";
import IsolatedComponent from "@/components/IsolatedComponent";
import { type CustomFormComponentProps } from "./CustomFormComponent";
import { PIXIEBRIX_INTEGRATION_FIELD_SCHEMA } from "@/integrations/constants";
import {
  assumeNotNullish_UNSAFE,
  type Nullishable,
} from "@/utils/nullishUtils";
import {
  MergeStrategies,
  type StateNamespace,
  StateNamespaces,
} from "@/platform/state/stateController";

interface DatabaseResult {
  success: boolean;
  data: unknown;
}

/**
 * Mod variable / page state storage definition.
 */
export type StateStorage = {
  type: "state";
  namespace?: StateNamespace;
};

/**
 * The storage/data binding configuration for the form.
 *
 * @since 2.0.3 Removed support for `localStorage`
 */
export type Storage =
  | {
      type: "database";
      databaseId: UUID;
      service: SanitizedIntegrationConfig;
    }
  | StateStorage;

type Context = { blueprintId: Nullishable<RegistryId>; extensionId: UUID };

/**
 * Action to perform after the onSubmit handler is executed.
 * @since 1.8.12
 */
export type PostSubmitAction = "save" | "reset";

export const CUSTOM_FORM_SCHEMA: Schema = {
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
            service: PIXIEBRIX_INTEGRATION_FIELD_SCHEMA,
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
              default: StateNamespaces.MOD,
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
      description: "Custom action to perform when the form is submitted",
    },
    // Added in 1.8.12 to enable resetting the form after submission, e.g., for chat/search-style interfaces
    postSubmitAction: {
      type: "string",
      enum: ["save", "reset"],
      title: "Post Submit Action",
      description:
        "Action to perform after the custom onSubmit handler is executed. Save will save the form data, reset will clear the form data",
      default: "save",
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
        "Unique identifier for the data record. Required if using a database for storage",
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
    } as Schema,
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
      default: false,
    },
  },
  required: ["schema", "storage"],
};

const IsolatedCustomFormComponent: React.FunctionComponent<
  CustomFormComponentProps & { disableParentStyles: boolean }
> = ({ disableParentStyles, ...props }) => (
  <IsolatedComponent
    name="CustomFormComponent"
    noStyle={disableParentStyles}
    lazy={async () =>
      import(
        /* webpackChunkName: "isolated/CustomFormComponent" */
        "./CustomFormComponent"
      )
    }
    factory={(CustomFormComponent) => <CustomFormComponent {...props} />}
  />
);

export class CustomFormRenderer extends RendererABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/form");

  static ON_SUBMIT_VARIABLE_NAME = validateOutputKey("values");

  constructor() {
    super(
      CustomFormRenderer.BRICK_ID,
      "Custom Form",
      "Show a custom form connected to a data source",
    );
  }

  inputSchema: Schema = CUSTOM_FORM_SCHEMA;

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  override getPipelineVariableSchema(
    _config: BrickConfig,
    pipelineName: string,
  ): Schema | undefined {
    if (pipelineName === "onSubmit") {
      if (
        isPlainObject(_config.config.schema) &&
        !isExpression(_config.config.schema)
      ) {
        return _config.config.schema as Schema;
      }

      return SCHEMA_ALLOW_ANY;
    }

    return super.getPipelineVariableSchema(_config, pipelineName);
  }

  async render(
    {
      storage,
      recordId,
      schema,
      uiSchema,
      autoSave = false,
      successMessage,
      submitCaption = "Submit",
      className,
      stylesheets = [],
      disableParentStyles,
      onSubmit,
      // Default to save if not provided for backwards compatibility
      postSubmitAction = "save",
    }: BrickArgs<{
      storage: Storage;
      recordId: string | null;
      schema: Schema;
      uiSchema?: UiSchema;
      autoSave?: boolean;
      successMessage?: string;
      submitCaption?: string;
      className?: string;
      stylesheets?: string[];
      disableParentStyles?: boolean;
      onSubmit?: PipelineExpression;
      postSubmitAction?: PostSubmitAction;
    }>,
    { logger, runPipeline, platform }: BrickOptions,
  ): Promise<ComponentRef> {
    if (logger.context.extensionId == null) {
      throw new Error("extensionId is required");
    }

    // Redundant with the JSON Schema input validation for `required`. But keeping here for clarity
    if (!storage) {
      throw new PropError(
        "storage is required since extension version 2.0.3",
        this.id,
        "storage",
        storage,
      );
    }

    if (isEmpty(recordId) && storage.type === "database") {
      throw new PropError(
        "recordId is required for database storage",
        this.id,
        "recordId",
        recordId,
      );
    } else {
      // We can assume that recordId is not null for state because recordId is not needed
      // This greatly simplifies the typing for the rest of the function
      assumeNotNullish_UNSAFE(recordId);
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
      Component: IsolatedCustomFormComponent,
      props: {
        recordId,
        formData: normalizedData,
        schema,
        uiSchema,
        autoSave,
        submitCaption,
        className,
        stylesheets,
        // Option only applies if a custom onSubmit handler is provided
        resetOnSubmit: onSubmit != null && postSubmitAction === "reset",
        disableParentStyles,
        async onSubmit(
          values: JsonObject,
          { submissionCount }: { submissionCount: number },
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
                    CustomFormRenderer.ON_SUBMIT_VARIABLE_NAME,
                  )]: normalizedValues,
                },
              );

              if (postSubmitAction === "save") {
                await setData(storage, recordId, normalizedValues, {
                  blueprintId,
                  extensionId,
                });
              }
            } else {
              await setData(storage, recordId, normalizedValues, {
                blueprintId,
                extensionId,
              });
            }

            if (successMessage) {
              platform.toasts.showNotification({
                type: "success",
                message: successMessage,
              });
            }
          } catch (error) {
            platform.toasts.showNotification({
              type: "error",
              message: "Error submitting form",
              error,
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
  { blueprintId, extensionId }: Partial<Context>,
): Promise<UnknownObject> {
  switch (storage.type) {
    case "state": {
      const namespace = storage.namespace ?? StateNamespaces.MOD;
      const topLevelFrame = await getConnectedTarget();
      // XXX: CustomForm currently uses page state directly instead of the platform's state API. The platform state API
      // does not currently provide a way to specify which frame to read the data from. Calling the API would use
      // the state in whichever frame the call came from.
      //
      // For sidebar panels (from sidebar mod or display temporary information), we'd want it to always be the top-level
      // frame. Although ths sidebar is in the Chromium Side Panel which is technically a separate frame, conceptually
      // mods treat the sidebar panel as being associated with the top-level frame.
      //
      // Popover and modal panels can technically be run from within frames. Changing the behavior here
      // to target the parent frame of the panel would technically be a breaking change. However, there are
      // likely very few, if any, instances of custom forms in popovers or modals in the wild.
      //
      // The correct future behavior will be to use the platform state API, but target the frame that the panel
      // is rendered in. And for the PixieBrix sidebar, target the top-level frame.
      return getPageState(topLevelFrame, {
        namespace,
        blueprintId,
        extensionId,
      });
    }

    case "database": {
      const {
        data: { data },
      } = await getPlatform().request<DatabaseResult>(storage.service, {
        url: `/api/databases/${storage.databaseId}/records/${encodeURIComponent(
          recordId,
        )}/`,
        params: {
          missing_key: "blank",
        },
      });
      assertObject(data, BusinessError);
      return data;
    }

    default: {
      throw new PropError(
        "Invalid storage type",
        CustomFormRenderer.BRICK_ID,
        "storage",
        storage,
      );
    }
  }
}

async function setData(
  storage: Storage,
  recordId: string,
  values: UnknownObject,
  { blueprintId, extensionId }: Context,
): Promise<void> {
  const cleanValues = ensureJsonObject(values);

  switch (storage.type) {
    case "database": {
      await getPlatform().request(storage.service, {
        url: `/api/databases/${storage.databaseId}/records/`,
        method: "put",
        data: {
          id: recordId,
          data: cleanValues,
          // Using shallow strategy to support partial data forms
          // In case when a form contains (and submits) only a subset of all the fields of a record,
          // the fields missing in the form will not be removed from the DB record
          merge_strategy: MergeStrategies.SHALLOW,
        },
      });
      return;
    }

    case "state": {
      const topLevelFrame = await getConnectedTarget();
      // Target the top level frame. Inline panels aren't generally available, so the renderer will always be in the
      // sidebar which runs in the context of the top-level frame
      await setPageState(topLevelFrame, {
        namespace: storage.namespace ?? StateNamespaces.MOD,
        data: cleanValues,
        mergeStrategy: MergeStrategies.SHALLOW,
        extensionId,
        blueprintId,
      });
      return;
    }

    default: {
      throw new PropError(
        "Invalid storage type",
        CustomFormRenderer.BRICK_ID,
        "storage",
        storage,
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
  for (const key of Object.keys(schema.properties ?? {})) {
    // eslint-disable-next-line security/detect-object-injection -- iterating over object keys
    const fieldValue = data[key];

    if (fieldValue != null) {
      set(normalizedData, key, fieldValue);
    }
  }

  return normalizedData;
}

// The server uses a shallow merge strategy that ignores undefined values, so we need to make all the undefined field
// values null instead, so that the server will clear those fields instead of ignoring them
export function normalizeOutgoingFormData(schema: Schema, data: UnknownObject) {
  const normalizedData = { ...data };
  for (const key of Object.keys(schema.properties ?? {})) {
    if (normalizedData[key] === undefined) {
      normalizedData[key] = null;
    }
  }

  return normalizedData;
}
