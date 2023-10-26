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

/* eslint-disable security/detect-object-injection */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { type FieldProps, type IChangeEvent } from "@rjsf/core";
import {
  type RJSFSchema,
  type SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import FormPreviewStringField from "./FormPreviewStringField";
import {
  UI_SCHEMA_ACTIVE,
  UI_WIDGET,
} from "@/components/formBuilder/schemaFieldNames";
import { produce } from "immer";
import FormPreviewBooleanField from "./FormPreviewBooleanField";
import { unwrapTemplateExpressions } from "@/components/fields/fieldUtils";
import ImageCropWidgetPreview from "@/components/formBuilder/preview/ImageCropWidgetPreview";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import RjsfSelectWidget from "@/components/formBuilder/RjsfSelectWidget";
import FormPreviewSchemaField from "./FormPreviewSchemaField";
import databaseSchema from "@schemas/database.json";
import googleSheetSchema from "@schemas/googleSheetId.json";
import { type Draft } from "immer";
import { KEYS_OF_UI_SCHEMA, type Schema } from "@/types/schemaTypes";
import FormPreviewArrayField from "@/components/formBuilder/preview/FormPreviewArrayField";

export type FormPreviewProps = {
  rjsfSchema: RJSFSchema;
  activeField?: string;
  setActiveField: SetActiveField;
};

const FormPreview: React.FC<FormPreviewProps> = ({
  rjsfSchema,
  activeField,
  setActiveField,
}) => {
  const [data, setData] = useState(null);
  const onDataChanged = ({ formData }: IChangeEvent<unknown>) => {
    setData(formData);
  };

  const { schema: previewSchema, uiSchema: previewUiSchema } = useMemo(
    () =>
      produce(rjsfSchema, (draft) => {
        const { schema: draftSchema, uiSchema: draftUiSchema } = draft;
        if (!draftSchema || !draftUiSchema) {
          return;
        }

        if (activeField) {
          if (!draftUiSchema[activeField]) {
            draftUiSchema[activeField] = {};
          }

          draftUiSchema[activeField][UI_SCHEMA_ACTIVE] = true;
        }

        unwrapTemplateExpressions(draft);

        if (typeof draftSchema.properties === "object") {
          const databaseProperties = Object.values(
            draftSchema.properties
          ).filter(
            (value) =>
              typeof value === "object" && value.$ref === databaseSchema.$id
          ) as Array<Draft<Schema>>;

          for (const property of databaseProperties) {
            property.type = "string";

            if (property.format === "preview") {
              // Intentionally setting a string value, not an array. @see FormPreviewSchemaField for details
              property.enum = [`[Mod Name] - ${activeField} database`];
            } else {
              // Intentionally setting a string value, not an array. @see FormPreviewSchemaField for details
              property.enum = ["Select..."];
            }

            delete property.$ref;
          }

          const googleSheetProperties = Object.values(
            draftSchema.properties
          ).filter(
            (value) =>
              typeof value === "object" && value.$ref === googleSheetSchema.$id
          ) as Array<Draft<Schema>>;

          for (const property of googleSheetProperties) {
            property.type = "string";

            // Intentionally setting a string value, not an array. @see FormPreviewSchemaField for details
            // @ts-expect-error -- intentionally assigning to a string
            property.enum = "Select a sheet...";
            delete property.$ref;
          }
        }

        // Set default values for multi-select checkboxes and dropdowns
        for (const [key, value] of Object.entries(draftUiSchema)) {
          // We're only looking for sub-property UiSchemas
          if (KEYS_OF_UI_SCHEMA.includes(key)) {
            continue;
          }

          const propertySchema = draftSchema.properties[key];

          if (!(UI_WIDGET in value) || typeof propertySchema !== "object") {
            continue;
          }

          // If the options enum for the checkboxes widget is not an array (i.e. if the enum references a variable),
          // then set a default value in order to allow the preview to render.
          if (
            value[UI_WIDGET] === "checkboxes" &&
            typeof propertySchema.items === "object" &&
            !Array.isArray(propertySchema.items)
          ) {
            propertySchema.items.enum = Array.isArray(propertySchema.items.enum)
              ? propertySchema.items.enum
              : ["Option 1", "Option 2", "Option 3"];
            continue;
          }

          // RJSF Form throws when Dropdown with labels selected, no options set and default is empty. Set a default
          // value to avoid this.
          if (
            value[UI_WIDGET] === "select" &&
            propertySchema.oneOf !== undefined
          ) {
            if (propertySchema.default == null) {
              // Setting the default value for preview to hide an empty option
              propertySchema.default = "";
            }

            if (!propertySchema.oneOf?.length) {
              propertySchema.oneOf = [{ const: "" }];
            }
          }
        }
      }),
    [rjsfSchema, activeField]
  );

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  const StringField = useCallback(
    (props: FieldProps) => (
      <FormPreviewStringField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );
  const BooleanField = useCallback(
    (props: FieldProps) => (
      <FormPreviewBooleanField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  const ArrayField = useCallback(
    (props: FieldProps) => (
      <FormPreviewArrayField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  if (!previewSchema || !previewUiSchema) {
    return null;
  }

  const fields = {
    SchemaField: FormPreviewSchemaField,
    StringField,
    BooleanField,
    DescriptionField,
    ArrayField,
  };

  const widgets = {
    imageCrop: ImageCropWidgetPreview,
    database: RjsfSelectWidget,
    SelectWidget: RjsfSelectWidget,
    googleSheet: RjsfSelectWidget,
  };

  return (
    <JsonSchemaForm
      tagName="div"
      formData={data}
      fields={fields}
      widgets={widgets}
      schema={previewSchema}
      uiSchema={previewUiSchema}
      onChange={onDataChanged}
      FieldTemplate={FieldTemplate}
    >
      <div>
        {/* This <div/> prevents JsonSchemaForm from rendering a Submit button */}
      </div>
    </JsonSchemaForm>
  );
};

export default FormPreview;
