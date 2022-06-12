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

import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Schema } from "@/core";
import React, { useCallback, useEffect, useState } from "react";
import { validateRegistryId } from "@/types/helpers";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import useReduxState from "@/hooks/useReduxState";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useField, useFormikContext } from "formik";
import { joinName } from "@/utils";
import { partial } from "lodash";
import {
  customFormRendererSchema,
  Storage,
} from "@/blocks/renderers/customForm";
import AppServiceField from "@/components/fields/schemaFields/AppServiceField";
import DatabaseField from "@/pageEditor/fields/DatabaseField";
import { SERVICE_BASE_SCHEMA } from "@/services/serviceUtils";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";

export const FORM_RENDERER_ID = validateRegistryId("@pixiebrix/form");

const recordIdSchema: Schema = {
  type: "string",
  description: "Unique identifier for the data record",
};

const serviceSchema: Schema = {
  $ref: `${SERVICE_BASE_SCHEMA}${PIXIEBRIX_SERVICE_ID}`,
};

function usePruneUnusedServiceDependencies() {
  const { values: formState, setValues: setFormState } =
    useFormikContext<FormState>();

  return useCallback(() => {
    const nextState = produceExcludeUnusedDependencies(formState);

    setFormState(nextState);
  }, [formState, setFormState]);
}

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

  const [{ value: storage }, , { setValue: setStorageValue }] =
    useField<Storage>(makeName("storage"));
  const storageType = storage?.type ?? "localStorage";
  const [previousStorageType, setPreviousStorageType] = useState(storageType);

  useEffect(() => {
    if (storageType !== previousStorageType) {
      // Clear out any other values the user might have configured
      setStorageValue({ type: "database" } as Storage);

      if (previousStorageType === "database") {
        // I was a bit surprised this works. I would have thought the pruneDependencies call would have seen
        // a stale copy of the form state.
        pruneDependencies();
      }

      setPreviousStorageType(storageType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setStorageValue reference changes on each render
  }, [
    pruneDependencies,
    storageType,
    previousStorageType,
    setPreviousStorageType,
  ]);

  return (
    <div>
      <SchemaField
        name={makeName("storage", "type")}
        schema={{
          type: "string",
          enum: ["localStorage", "state", "database"],
          default: "state",
          description: "The location to submit/store the form data",
        }}
      />

      {storageType === "database" && (
        <>
          <DatabaseField name={makeName("storage", "databaseId")} />
          <AppServiceField
            name={makeName("storage", "service")}
            schema={serviceSchema}
          />
        </>
      )}

      {storageType === "state" && (
        <SchemaField
          name={makeName("storage", "namespace")}
          schema={
            customFormRendererSchema.properties.storage.oneOf[1].properties
              .namespace
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
        name={makeName("successMessage")}
        label="Success Message"
        schema={customFormRendererSchema.properties.successMessage as Schema}
      />

      <ConfigErrorBoundary>
        <FormEditor
          name={configName}
          activeField={activeElement}
          setActiveField={setActiveElement}
        />
      </ConfigErrorBoundary>
    </div>
  );
};

export default FormRendererOptions;
