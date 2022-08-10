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

/* eslint-disable security/detect-object-injection */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { FieldProps, IChangeEvent } from "@rjsf/core";
import {
  RJSFSchema,
  SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import FormPreviewStringField from "./FormPreviewStringField";
import {
  UI_SCHEMA_ACTIVE,
  UI_WIDGET,
} from "@/components/formBuilder/schemaFieldNames";
import { produce } from "immer";
import FormPreviewBooleanField from "./FormPreviewBooleanField";
import {
  getPreviewValues,
  unwrapTemplateExpressions,
} from "@/components/fields/fieldUtils";
import ImageCropWidgetPreview from "@/components/formBuilder/preview/ImageCropWidgetPreview";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import SelectWidgetPreview from "./SelectWidgetPreview";
import FormPreviewSchemaField from "./FormPreviewSchemaField";
import { isExpression } from "@/runtime/mapArgs";
import { isEmpty } from "lodash";

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

  // Maintain a local version of the RJSF schema to reflect the active field.
  // Important to have schema and uiSchema always in sync, hence caching both.
  // RJSF can throw an error for a certain schema configuration
  // (see a comment re select with label below),
  // this is why we never send the original schema to the From Preview.
  const [{ schema, uiSchema }, setLocalRjsfSchema] = useState<RJSFSchema>({});

  const previewSchema = useMemo(() => {
    const unwrappedSchema = produce(schema, (draft) => {
      unwrapTemplateExpressions(draft);

      if (!schema || !uiSchema) {
        return;
      }

      // RJSF Form throws when Dropdown with labels selected, no options set and default is empty
      // UI Widget must be set for the Select, loop through the uiSchema props
      for (const [key, value] of Object.entries(uiSchema)) {
        const propertySchema = draft.properties[key];

        // We only interested in select with labels, otherwise we don't need to do anything
        if (
          !(UI_WIDGET in value) ||
          value[UI_WIDGET] !== "select" ||
          typeof propertySchema !== "object" ||
          typeof propertySchema.oneOf === "undefined"
        ) {
          continue;
        }

        if (propertySchema.default == null) {
          // Setting the default value for preview to hide an empty option
          propertySchema.default = "";
        }

        if (!propertySchema.oneOf?.length) {
          propertySchema.oneOf = [{ const: "" }];
        }
      }
    });
    return unwrappedSchema;
  }, [schema, uiSchema]);

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  // Setting local schema
  useEffect(() => {
    const nextLocalRjsfSchema = produce<RJSFSchema>(rjsfSchema, (draft) => {
      if (activeField) {
        if (!draft.uiSchema[activeField]) {
          draft.uiSchema[activeField] = {};
        }

        draft.uiSchema[activeField][UI_SCHEMA_ACTIVE] = true;
      }

      // RJSF Form throws when Dropdown with labels selected, no options set and default is empty
      // Setting empty string as the default value of a Dropdown in the Preview
      /*
      for (const [key, value] of Object.entries(draft.uiSchema)) {
        const propertySchema = draft.schema.properties[key];

        // We only interested in select with labels, otherwise we don't need to do anything
        if (
          !(UI_WIDGET in value) ||
          value[UI_WIDGET] !== "select" ||
          typeof propertySchema !== "object" ||
          typeof propertySchema.oneOf === "undefined"
        ) {
          continue;
        }

        if (
          // No default value set
          propertySchema.default == null
        ) {
          console.log("propertySchema", {
            schema: rjsfSchema.schema.properties[key],
            uiSchema: rjsfSchema.uiSchema[key],
            exp: isExpression(propertySchema.oneOf),
            isEmpty: isEmpty(propertySchema.oneOf?.__value__),
          });

          if (isExpression(propertySchema.oneOf)) {
            if (!isEmpty(propertySchema.oneOf.__value__)) {
              continue;
            }
          } else if (propertySchema.oneOf?.length > 0) {
            continue;
          }

          propertySchema.oneOf = [
            {
              const: "[not set]",
            },
          ];
        }
      }
      */
    });

    setLocalRjsfSchema(nextLocalRjsfSchema);
  }, [activeField, rjsfSchema]);

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

  if (!schema || !uiSchema) {
    return null;
  }

  const fields = {
    SchemaField: FormPreviewSchemaField,
    StringField,
    BooleanField,
    DescriptionField,
  };

  const widgets = {
    imageCrop: ImageCropWidgetPreview,
    SelectWidget: SelectWidgetPreview,
  };

  console.log("preview Schema", {
    previewSchema,
  });

  return (
    <JsonSchemaForm
      tagName="div"
      formData={data}
      fields={fields}
      widgets={widgets}
      schema={previewSchema}
      uiSchema={uiSchema}
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
