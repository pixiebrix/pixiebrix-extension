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

import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "@/types/schemaTypes";
import React, { useCallback, useState } from "react";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import FormIntroFields from "@/components/formBuilder/edit/FormIntroFields";
import useReduxState from "@/hooks/useReduxState";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectActiveBuilderPreviewElement } from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { useField, useFormikContext } from "formik";
import { partial } from "lodash";
import {
  CUSTOM_FORM_SCHEMA,
  type PostSubmitAction,
  type Storage,
} from "@/bricks/renderers/customForm";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import FieldTemplate from "@/components/form/FieldTemplate";
import Select, { type Options } from "react-select";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";
import databaseSchema from "@schemas/database.json";
import { joinName } from "@/utils/formUtils";
import useAsyncEffect from "use-async-effect";
import PipelineToggleField from "@/pageEditor/fields/PipelineToggleField";
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import type { PipelineExpression } from "@/types/runtimeTypes";
import { Collapse } from "react-bootstrap";
import { PIXIEBRIX_INTEGRATION_FIELD_SCHEMA } from "@/integrations/constants";
import { StateNamespaces } from "@/platform/state/stateController";

const recordIdSchema: Schema = {
  type: "string",
  description: "Unique identifier for the data record",
};

const databaseIdSchema: Schema = {
  $ref: databaseSchema.$id,
};

function usePruneUnusedIntegrationDependencies() {
  const { values: formState, setValues: setFormState } =
    useFormikContext<ModComponentFormState>();

  return useCallback(async () => {
    const nextState = produceExcludeUnusedDependencies(formState);

    await setFormState(nextState);
  }, [formState, setFormState]);
}

type StringOption<Value extends string = string> = {
  label: string;
  value: Value;
};

const storageTypeOptions: Options<StringOption> = [
  { value: "state", label: "Mod Variables / Page State" },
  { value: "database", label: "Database" },
];

const postSubmitActionOptions: Options<StringOption<PostSubmitAction>> = [
  { value: "save", label: "Save Data" },
  { value: "reset", label: "Reset Form" },
];

const DEFAULT_STORAGE_TYPE = "state";

const FormDataBindingOptions: React.FC<{
  makeName: (...names: string[]) => string;
}> = ({ makeName }) => {
  const pruneDependencies = usePruneUnusedIntegrationDependencies();

  const [{ value: storage }, , { setValue: setStorageValue }] =
    useField<Storage>(makeName("storage"));

  const storageType = storage?.type;

  // Sets the storage type and clears out any other values the user might have configured
  // If the next type is "database", the "service" variable will be initialized
  const changeStorageType = async (nextStorageType: string) => {
    if (nextStorageType === "state") {
      await setStorageValue({
        type: "state",
        namespace: StateNamespaces.MOD,
      } as Storage);
    } else {
      await setStorageValue({ type: nextStorageType } as Storage);
    }
  };

  // If the storage type changes from "database" to something else, ensure the "service" record at root is cleared
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
    <>
      <FieldTemplate
        name={makeName("storage", "type")}
        label="Data Location"
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
          <SchemaField
            name={makeName("storage", "service")}
            schema={PIXIEBRIX_INTEGRATION_FIELD_SCHEMA}
          />
        </>
      )}

      {storageType === "state" && (
        <SchemaField
          name={makeName("storage", "namespace")}
          label="Namespace"
          isRequired
          schema={
            // @ts-expect-error -- Custom property
            CUSTOM_FORM_SCHEMA.properties.storage.oneOf[1].properties
              .namespace as Schema
          }
        />
      )}

      {storageType === "database" && (
        <SchemaField
          name={makeName("recordId")}
          label="Record ID"
          schema={recordIdSchema}
          isRequired
        />
      )}
    </>
  );
};

const FormSubmissionOptions: React.FC<{
  makeName: (...names: string[]) => string;
}> = ({ makeName }) => {
  const [{ value: autoSave }] = useField<boolean>(makeName("autoSave"));
  const [{ value: postSubmitAction = "save" }, , postSubmitHelpers] =
    useField<PostSubmitAction>(makeName("postSubmitAction"));
  const [{ value: onSubmit }] = useField<PipelineExpression | null>(
    makeName("onSubmit"),
  );

  const hideSubmitButtonName = makeName(
    "uiSchema",
    "ui:submitButtonOptions",
    "norender",
  );
  const [{ value: hideSubmitButton }] = useField<boolean>(hideSubmitButtonName);

  return (
    <>
      <SchemaField
        name={makeName("autoSave")}
        label="Auto Save/Submit"
        schema={CUSTOM_FORM_SCHEMA.properties.autoSave as Schema}
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
              label="Submit Button Caption"
              schema={CUSTOM_FORM_SCHEMA.properties.submitCaption as Schema}
            />
          )}
        </>
      )}

      <SchemaField
        name={makeName("successMessage")}
        label="Success Message"
        schema={CUSTOM_FORM_SCHEMA.properties.successMessage as Schema}
      />

      <PipelineToggleField
        label="Custom Submit Handler"
        description="Toggle on to run custom actions before the data is saved or form is reset. Edit the actions in the Brick Actions Panel"
        name={makeName("onSubmit")}
        onAfterChange={async (value) => {
          // Clean up the postSubmitAction if the custom submit handler is disabled
          if (!value) {
            await postSubmitHelpers.setValue(null);
          }
        }}
      />

      <Collapse in={Boolean(onSubmit)}>
        <FieldTemplate
          name={makeName("postSubmitAction")}
          label="Post Submit Action"
          description="The action to perform after the custom submit handler is run"
          as={Select}
          options={postSubmitActionOptions}
          value={
            postSubmitActionOptions.find((x) => x.value === postSubmitAction) ??
            postSubmitActionOptions[0]
          }
          onChange={async ({ value }: StringOption<PostSubmitAction>) => {
            await postSubmitHelpers.setValue(value);
          }}
        />
      </Collapse>
    </>
  );
};

const FormRendererOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const makeName = partial(joinName, name, configKey);
  const configName = makeName();

  const [activeElement, setActiveElement] = useReduxState(
    selectActiveBuilderPreviewElement,
    editorActions.setActiveBuilderPreviewElement,
  );

  return (
    <div>
      <ConnectedCollapsibleFieldSection
        title="Form Title/Description"
        initialExpanded
      >
        <FormIntroFields name={configName} />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Data Binding" initialExpanded>
        <FormDataBindingOptions makeName={makeName} />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Form Submission" initialExpanded>
        <FormSubmissionOptions makeName={makeName} />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Form Fields" initialExpanded>
        <ConfigErrorBoundary>
          <FormEditor
            name={configName}
            activeField={activeElement}
            setActiveField={setActiveElement}
            fieldTypes={FORM_FIELD_TYPE_OPTIONS}
          />
        </ConfigErrorBoundary>
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title={"Advanced: Theme"}>
        <SchemaField
          name={makeName("stylesheets")}
          schema={CUSTOM_FORM_SCHEMA.properties.stylesheets as Schema}
        />
        <SchemaField
          name={makeName("disableParentStyles")}
          schema={CUSTOM_FORM_SCHEMA.properties.disableParentStyles as Schema}
        />
      </ConnectedCollapsibleFieldSection>
    </div>
  );
};

export default FormRendererOptions;
