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

/* eslint-disable security/detect-object-injection -- keys do not come from customer input */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import validator from "../../../validators/formValidator";
import { type FieldTemplateProps } from "@rjsf/utils";
import { type IChangeEvent } from "@rjsf/core";
import {
  type RJSFSchema,
  type SetActiveField,
} from "../formBuilderTypes";
import {
  UI_SCHEMA_ACTIVE,
  UI_WIDGET,
} from "../schemaFieldNames";
import { produce } from "immer";
import { unwrapTemplateExpressions } from "../../fields/fieldUtils";
import ImageCropWidgetPreview from "./ImageCropWidgetPreview";
import DescriptionField from "../DescriptionField";
import RjsfSelectWidget from "../widgets/RjsfSelectWidget";
import FormPreviewSchemaField from "./FormPreviewSchemaField";
import databaseSchema from "../../../../schemas/database.json";
import googleSheetSchema from "../../../../schemas/googleSheetId.json";
import { type Draft } from "immer";
import { KEYS_OF_UI_SCHEMA, type Schema } from "../../../types/schemaTypes";
import { templates } from "../RjsfTemplates";
import FieldTemplate from "../FieldTemplate";
import { cloneDeep } from "lodash";
import RichTextWidget from "../widgets/RichTextWidget";

export type FormPreviewProps = {
  rjsfSchema: RJSFSchema;
  /**
   * The active field in the form builder, or null if no field is selected.
   */
  activeField: string | null;
  setActiveField: SetActiveField;
};

const FormPreview: React.FC<FormPreviewProps> = ({
  rjsfSchema,
  activeField,
  setActiveField,
}) => {
  const [data, setData] = useState<unknown>(null);
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
          draftUiSchema[activeField] ??= {};
          draftUiSchema[activeField][UI_SCHEMA_ACTIVE] = true;
        }

        unwrapTemplateExpressions(draft);

        if (typeof draftSchema.properties === "object") {
          const databaseProperties = Object.values(
            draftSchema.properties,
          ).filter(
            (value) =>
              typeof value === "object" && value.$ref === databaseSchema.$id,
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
            draftSchema.properties,
          ).filter(
            (value) =>
              typeof value === "object" && value.$ref === googleSheetSchema.$id,
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

          const propertySchema = draftSchema.properties?.[key];

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
            // Setting the default value for preview to hide an empty option
            propertySchema.default ??= "";

            if (!propertySchema.oneOf?.length) {
              propertySchema.oneOf = [{ const: "" }];
            }
          }
        }
      }),
    [rjsfSchema, activeField],
  );

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  const PreviewFieldTemplate = useCallback(
    (props: FieldTemplateProps) => (
      <FieldTemplate setActiveField={setActiveField} {...props} />
    ),
    [setActiveField],
  );

  if (!previewSchema || !previewUiSchema) {
    return null;
  }

  const fields = {
    SchemaField: FormPreviewSchemaField,
    DescriptionField,
  };

  const widgets = {
    imageCrop: ImageCropWidgetPreview,
    database: RjsfSelectWidget,
    SelectWidget: RjsfSelectWidget,
    googleSheet: RjsfSelectWidget,
    richText: RichTextWidget,
  };

  return (
    <JsonSchemaForm
      tagName="div"
      // Add margin to make room for the active element outline. Style is not added to FieldTemplate due to re-use when rendering the form
      className="mr-2"
      formData={data}
      fields={fields}
      widgets={widgets}
      // Deep clone the schema because otherwise the schema is not extensible, which
      // breaks validation when @cfworker/json-schema dereferences the schema
      // See https://github.com/cfworker/cfworker/blob/263260ea661b6f8388116db7b8daa859e0d28b25/packages/json-schema/src/dereference.ts#L115
      schema={cloneDeep(previewSchema)}
      uiSchema={{
        ...previewUiSchema,
        "ui:submitButtonOptions": { norender: true },
      }}
      onChange={onDataChanged}
      validator={validator}
      templates={{ ...templates, FieldTemplate: PreviewFieldTemplate }}
    />
  );
};

export default FormPreview;
