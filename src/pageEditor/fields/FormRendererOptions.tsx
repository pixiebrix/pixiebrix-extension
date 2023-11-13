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

import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "@/types/schemaTypes";
import React, { useCallback, useState } from "react";
import { validateRegistryId } from "@/types/helpers";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import useReduxState from "@/hooks/useReduxState";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useField, useFormikContext } from "formik";
import { partial } from "lodash";
import {
  customFormRendererSchema,
  type Storage,
} from "@/bricks/renderers/customForm";
import AppApiIntegrationDependencyField from "@/components/fields/schemaFields/AppApiIntegrationDependencyField";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import FieldTemplate from "@/components/form/FieldTemplate";
import Select, { type Options } from "react-select";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";
import databaseSchema from "@schemas/database.json";
import { joinName } from "@/utils/formUtils";
import useAsyncEffect from "use-async-effect";

export const FORM_RENDERER_ID = validateRegistryId("@pixiebrix/form");

const recordIdSchema: Schema = {
  type: "string",
  description: "Unique identifier for the data record",
};

const databaseIdSchema: Schema = {
  $ref: databaseSchema.$id,
};

function usePruneUnusedServiceDependencies() {
  const { values: formState, setValues: setFormState } =
    useFormikContext<ModComponentFormState>();

  return useCallback(async () => {
    const nextState = produceExcludeUnusedDependencies(formState);

    await setFormState(nextState);
  }, [formState, setFormState]);
}

type StringOption = {
  label: string;
  value: string;
};

const storageTypeOptions: Options<StringOption> = [
  { value: "state", label: "Page State" },
  { value: "database", label: "Database" },
  { value: "localStorage", label: "Local Storage (Deprecated)" },
];

const DEFAULT_STORAGE_TYPE = "state";

const FormRendererOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const makeName = partial(joinName, name, configKey);
  const configName = makeName();

  const pruneDependencies = usePruneUnusedServiceDependencies();

  const [activeElement, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  const [{ value: autoSave }] = useField<boolean>(makeName("autoSave"));
  const hideSubmitButtonName = makeName(
    "uiSchema",
    "ui:submitButtonOptions",
    "norender"
  );
  const [{ value: hideSubmitButton }] = useField<boolean>(hideSubmitButtonName);
  const [{ value: storage }, , { setValue: setStorageValue }] =
    useField<Storage>(makeName("storage"));
  const storageType = storage?.type;

  // Sets the storage type and clears out any other values the user might have configured
  // If the next type is "database", the AppServiceField will initialize the "service" variable
  const changeStorageType = async (nextStorageType: string) => {
    if (nextStorageType === "state") {
      await setStorageValue({
        type: "state",
        namespace: "blueprint",
      } as Storage);
    } else {
      await setStorageValue({ type: nextStorageType } as Storage);
    }
  };

  // If the storage type changes from "database" to something else, ensure the service record at root is cleared
  const [previousStorageType, setPreviousStorageType] = useState(storageType);
  useAsyncEffect(async () => {
    if (
      previousStorageType === "database" &&
      storageType !== previousStorageType
    ) {
      setPreviousStorageType(storageType);
      await pruneDependencies();
    }
    // This is the only place that changes the previousStorageType, no need to depend on it
  }, [storageType, pruneDependencies]);

  useAsyncEffect(async () => {
    // Set the default storage type
    if (storageType == null) {
      await changeStorageType(DEFAULT_STORAGE_TYPE);
    }
  }, [storageType, changeStorageType]);

  return (
    <div>
      <FieldTemplate
        name={makeName("storage", "type")}
        label="Storage Location"
        description="The location to submit/store the form data"
        as={Select}
        options={storageTypeOptions}
        value={storageTypeOptions.find((x) => x.value === storageType)}
        onChange={async ({ value: nextStorageType }: StringOption) => {
          await changeStorageType(nextStorageType);
        }}
      />

      {storageType === "database" && (
        <>
          <SchemaField
            name={makeName("storage", "databaseId")}
            label="Database"
            isRequired
            schema={databaseIdSchema}
          />
          <AppApiIntegrationDependencyField
            name={makeName("storage", "service")}
          />
        </>
      )}

      {storageType === "state" && (
        <SchemaField
          name={makeName("storage", "namespace")}
          label="State Namespace"
          isRequired
          schema={
            customFormRendererSchema.properties.storage.oneOf[1].properties
              .namespace as Schema
          }
        />
      )}

      {["localStorage", "database"].includes(storageType) && (
        <SchemaField
          name={makeName("recordId")}
          label="Record ID"
          schema={recordIdSchema}
          isRequired
        />
      )}

      <SchemaField
        name={makeName("autoSave")}
        label="Auto Save"
        schema={customFormRendererSchema.properties.autoSave as Schema}
      />

      {!autoSave && (
        <>
          <SchemaField
            name={hideSubmitButtonName}
            schema={{
              type: "boolean",
              title: "Hide Submit Button?",
              description:
                "Toggle on to hide the submit button. Caution: when using this option, you must also enable either autoSave or submit-on-enter so that the form can still be submitted.",
              default: false,
            }}
          />

          {!hideSubmitButton && (
            <SchemaField
              name={makeName("submitCaption")}
              label="Submit Caption"
              schema={
                customFormRendererSchema.properties.submitCaption as Schema
              }
            />
          )}
        </>
      )}

      <SchemaField
        name={makeName("successMessage")}
        label="Success Message"
        schema={customFormRendererSchema.properties.successMessage as Schema}
      />

      <ConfigErrorBoundary>
        <FormEditor
          name={configName}
          activeField={activeElement}
          setActiveField={setActiveElement}
          fieldTypes={FORM_FIELD_TYPE_OPTIONS}
        />
      </ConfigErrorBoundary>
    </div>
  );
};

export default FormRendererOptions;
