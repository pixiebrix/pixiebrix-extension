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
import React from "react";
import { validateRegistryId } from "@/types/helpers";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import useReduxState from "@/hooks/useReduxState";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useField } from "formik";
import { joinName } from "@/utils";
import { partial } from "lodash";
import { Storage } from "@/blocks/renderers/customForm";
import AppServiceField from "@/components/fields/schemaFields/AppServiceField";
import DatabaseField from "@/pageEditor/fields/DatabaseField";
import { SERVICE_BASE_SCHEMA } from "@/services/serviceUtils";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

export const FORM_RENDERER_ID = validateRegistryId("@pixiebrix/form");

const recordIdSchema: Schema = {
  type: "string",
  description: "Unique identifier for the data record",
};

const serviceSchema: Schema = {
  $ref: `${SERVICE_BASE_SCHEMA}${PIXIEBRIX_SERVICE_ID}`,
};

const FormRendererOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const makeName = partial(joinName, name, configKey);
  const configName = makeName();

  const [activeElement, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  const [{ value: storage }] = useField<Storage>(makeName("storage"));

  // FIXME: perform state cleanup when switching between storage types

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

      {storage.type === "database" && (
        <>
          <DatabaseField name={makeName("storage", "databaseId")} />
          <AppServiceField
            name={makeName("storage", "service")}
            schema={serviceSchema}
          />
        </>
      )}

      {storage.type === "state" && (
        <SchemaField
          name={makeName("storage", "namespace")}
          schema={{
            type: "string",
            enum: ["blueprint", "extension", "shared"],
            default: "blueprint",
            description:
              "The namespace for the storage, to avoid conflicts. If set to blueprint and the extension is not part of a blueprint, defaults to shared",
          }}
        />
      )}

      {["localStorage", "database"].includes(storage.type) && (
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
        schema={{
          type: "string",
          default: "Submitted form",
          description:
            "An optional message to display if the form submitted successfully",
        }}
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
