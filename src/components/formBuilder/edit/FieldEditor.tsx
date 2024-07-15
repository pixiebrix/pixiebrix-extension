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

import { useField } from "formik";
import React, { type ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./FieldEditor.module.scss";
import {
  type RJSFSchema,
  type SelectStringOption,
  type SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import { UI_WIDGET } from "@/components/formBuilder/schemaFieldNames";
import {
  FIELD_TYPES_WITHOUT_DEFAULT,
  parseUiType,
  produceSchemaOnPropertyNameChange,
  produceSchemaOnUiTypeChange,
  replaceStringInArray,
  stringifyUiType,
  type UiType,
  type UiTypeExtra,
  validateNextPropertyName,
} from "@/components/formBuilder/formBuilderHelpers";
import FieldTemplate from "@/components/form/FieldTemplate";
import { produce } from "immer";
import SelectWidget, {
  type SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { uniq, partial } from "lodash";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import databaseSchema from "@schemas/database.json";
import googleSheetIdSchema from "@schemas/googleSheetId.json";
import {
  isDatabaseField,
  isGoogleSheetIdField,
} from "@/components/fields/schemaFields/fieldTypeCheckers";
import { type Schema, type SchemaPropertyType } from "@/types/schemaTypes";
import { AnnotationType } from "@/types/annotationTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import { Collapse } from "react-bootstrap";
import { joinName, joinPathParts } from "@/utils/formUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

const imageForCroppingSourceSchema: Schema = {
  type: "string",
  description:
    "The source image data URI: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs",
};

const UNKNOWN_OPTION: SelectStringOption = {
  label: "unknown",
  value: null,
};

function shouldShowPlaceholderText(uiType: UiType): boolean {
  switch (true) {
    case uiType.propertyType === "number": {
      return true;
    }

    // No need to render placeholder text for anything that isn't propertyType string or number
    case uiType.propertyType !== "string": {
      return false;
    }

    // Single-line text, Paragraph text, Email, and Website fields
    case uiType.uiWidget === "textarea":
    case uiType.propertyFormat === "email":
    case uiType.propertyFormat === "uri":
    case !uiType.uiWidget && !uiType.propertyFormat: {
      return true;
    }

    default: {
      return false;
    }
  }
}

const TextAreaFields: React.FC<{ uiOptionsPath: string }> = ({
  uiOptionsPath,
}) => {
  const configName = partial(joinName, uiOptionsPath);
  const [{ value: showSubmitToolbar }] = useField<boolean | null>(
    configName("submitToolbar", "show"),
  );

  return (
    <>
      <SchemaField
        name={configName("rows")}
        schema={{
          type: "number",
          title: "# Rows",
          description:
            "The number of visible text lines for the control. If it is not specified, the default value is 2.",
        }}
      />
      <SchemaField
        name={configName("submitOnEnter")}
        schema={{
          type: "boolean",
          title: "Submit Form on Enter?",
          description:
            "If enabled, pressing Enter will submit the form. Press Shift+Enter for newlines in this mode",
        }}
        isRequired
      />
      <SchemaField
        name={configName("submitToolbar", "show")}
        schema={{
          type: "boolean",
          title: "Include Submit Toolbar?",
          description:
            "Enable the submit toolbar that has a selectable icon to act as a submit button",
        }}
        isRequired
      />
      <Collapse in={showSubmitToolbar ?? false}>
        <SchemaField
          name={configName("submitToolbar", "icon")}
          schema={{ $ref: "https://app.pixiebrix.com/schemas/icon#" }}
          label="Select Icon"
          description="Select the icon that appears in the bottom right of the Submit Toolbar"
          uiSchema={{
            "ui:widget": "IconWidget",
          }}
        />
      </Collapse>
    </>
  );
};

const FieldEditor: React.FC<{
  name: string;
  propertyName: string;
  setActiveField: SetActiveField;
  fieldTypes: SelectStringOption[];
}> = ({ name, propertyName, setActiveField, fieldTypes }) => {
  const [{ value: rjsfSchema }, , { setValue: setRjsfSchema }] =
    useField<RJSFSchema>(name);
  const { schema, uiSchema } = rjsfSchema;
  const fullPropertyName = `${name}.schema.properties.${propertyName}`;
  const [{ value: propertySchema }] = useField<Schema>(fullPropertyName);
  const getFullFieldName = (fieldName: string) =>
    `${fullPropertyName}.${fieldName}`;

  const [internalPropertyName, setInternalPropertyName] = useState<string>("");
  const [propertyNameError, setPropertyNameError] = useState<string | null>(
    null,
  );
  useEffect(() => {
    setInternalPropertyName(propertyName);
    setPropertyNameError(null);
  }, [propertyName, schema]);

  const propertyNameAnnotations = useMemo(
    () =>
      isNullOrBlank(propertyNameError)
        ? []
        : [{ message: propertyNameError, type: AnnotationType.Error }],
    [propertyNameError],
  );

  const validatePropertyName = (nextName: string) => {
    assertNotNullish(
      schema,
      "Schema must be defined to validate property name",
    );
    const error = validateNextPropertyName(schema, propertyName, nextName);

    setPropertyNameError(error);

    return error;
  };

  const onPropertyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    validatePropertyName(nextName);
    setInternalPropertyName(nextName);
  };

  const updatePropertyName = async () => {
    const nextName = internalPropertyName;
    if (nextName === propertyName) {
      return;
    }

    const error = validatePropertyName(nextName);
    if (error) {
      return;
    }

    const nextRjsfSchema = produceSchemaOnPropertyNameChange(
      rjsfSchema,
      propertyName,
      nextName,
    );
    await setRjsfSchema(nextRjsfSchema);
    setActiveField(nextName);
  };

  const onUiTypeChange: SelectWidgetOnChange = async (event) => {
    const { value } = event.target;
    if (!value) {
      return;
    }

    const nextRjsfSchema = produceSchemaOnUiTypeChange(
      rjsfSchema,
      propertyName,
      value,
    );

    await setRjsfSchema(nextRjsfSchema);
  };

  const getSelectedUiTypeOption = () => {
    assertNotNullish(
      schema?.properties,
      "Schema properties must be defined to get selected UI type option",
    );
    const fieldSchema = schema.properties[propertyName];

    assertNotNullish(fieldSchema, `Field schema not found for ${propertyName}`);

    if (typeof fieldSchema === "boolean") {
      return UNKNOWN_OPTION;
    }

    const isDatabaseFieldType = isDatabaseField(fieldSchema);
    const isGoogleSheetFieldType = isGoogleSheetIdField(fieldSchema);

    const propertyType =
      isDatabaseFieldType || isGoogleSheetFieldType
        ? "string"
        : (propertySchema.type as SchemaPropertyType);

    const uiWidget = isDatabaseFieldType
      ? "database"
      : isGoogleSheetFieldType
        ? "googleSheet"
        : uiSchema?.[propertyName]?.[UI_WIDGET];

    const propertyFormat = propertySchema.format;
    const extra: UiTypeExtra =
      uiWidget === "select" && propertySchema.oneOf !== undefined
        ? "selectWithLabels"
        : undefined;

    const uiType = stringifyUiType({
      propertyType,
      uiWidget,
      propertyFormat,
      extra,
    });

    const selected = fieldTypes.find((option) => option.value === uiType);

    return selected ?? UNKNOWN_OPTION;
  };

  const onRequiredChange = async ({
    target: { value: nextIsRequired },
  }: React.ChangeEvent<CheckBoxLike>) => {
    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      assertNotNullish(
        draft.schema,
        "Schema must be defined to change required",
      );

      draft.schema.required ||= [];

      if (nextIsRequired) {
        draft.schema.required.push(propertyName);
        draft.schema.required = uniq(draft.schema.required);
      } else {
        draft.schema.required = replaceStringInArray(
          draft.schema.required,
          propertyName,
        );
      }
    });

    await setRjsfSchema(nextRjsfSchema);
  };

  const isRequired = (schema?.required ?? []).includes(propertyName);

  const selectedUiTypeOption = getSelectedUiTypeOption();

  const labelFieldProps: SchemaFieldProps = {
    name: getFullFieldName("title"),
    schema: {
      type: "string",
      description: "The user-visible label for this field",
    },
    label: "Label",
  };
  const descriptionFieldProps: SchemaFieldProps = {
    name: getFullFieldName("description"),
    schema: {
      type: "string",
      description:
        "The user-visible description for the field. Supports [Markdown](https://docs.pixiebrix.com/developing-mods/developer-concepts/working-with-markdown)",
    },
    label: "Field Description",
  };
  const placeholderProps: SchemaFieldProps = {
    name: `${name}.uiSchema.${propertyName}.ui:placeholder`,
    schema: {
      type: "string",
      description:
        "A short hint displayed in the input field before the user enters a value.",
    },
    label: "Placeholder",
  };

  const uiType: UiType =
    selectedUiTypeOption.value == null
      ? {
          propertyType: "null",
          uiWidget: undefined,
          propertyFormat: undefined,
          extra: undefined,
        }
      : parseUiType(selectedUiTypeOption.value);

  const defaultFieldProps: SchemaFieldProps | null =
    selectedUiTypeOption.value == null
      ? null
      : {
          name: getFullFieldName("default"),
          schema:
            uiType.uiWidget === "database"
              ? {
                  $ref: databaseSchema.$id,
                }
              : uiType.uiWidget === "googleSheet"
                ? {
                    $ref: googleSheetIdSchema.$id,
                  }
                : {
                    type: uiType.propertyType,
                  },
          label: "Default Value",
          description:
            uiType.extra === "selectWithLabels"
              ? 'Should match one of the "const" values from the "Options" field'
              : undefined,
        };

  return (
    <div className={styles.root}>
      <FieldTemplate
        required
        name={fullPropertyName}
        label="Name"
        value={internalPropertyName}
        onChange={onPropertyNameChange}
        onBlur={updatePropertyName}
        annotations={propertyNameAnnotations}
        description="Enter a name to refer to this value in the output later"
      />
      <SchemaField {...labelFieldProps} />
      <SchemaField {...descriptionFieldProps} />
      <FieldTemplate
        name={getFullFieldName("uiType")}
        label="Input Type"
        as={SelectWidget}
        blankValue={null}
        options={fieldTypes}
        value={selectedUiTypeOption.value}
        onChange={onUiTypeChange}
      />

      {uiType.uiWidget === "imageCrop" && (
        <SchemaField
          label="Image source"
          name={`${name}.uiSchema.${propertyName}.source`}
          schema={imageForCroppingSourceSchema}
        />
      )}

      {defaultFieldProps &&
        !FIELD_TYPES_WITHOUT_DEFAULT.includes(
          selectedUiTypeOption.value ?? "",
        ) && <SchemaField {...defaultFieldProps} />}

      {shouldShowPlaceholderText(uiType) && (
        <SchemaField {...placeholderProps} />
      )}

      {propertySchema.enum && (
        <SchemaField
          label="Options"
          name={getFullFieldName("enum")}
          schema={{
            type: "array",
            items: {
              type: "string",
            },
          }}
          isRequired
        />
      )}

      {propertySchema.type === "array" && (
        <SchemaField
          label="Options"
          name={getFullFieldName("items.enum")}
          schema={{
            type: "array",
            items: {
              type: "string",
            },
          }}
          isRequired
        />
      )}

      {propertySchema.oneOf && (
        <SchemaField
          label="Options"
          name={getFullFieldName("oneOf")}
          schema={{
            type: "array",
            items: {
              type: "object",
              properties: {
                const: { type: "string" },
                title: { type: "string" },
              },
              required: ["const"],
            },
          }}
          isRequired
        />
      )}

      <FieldTemplate
        name={`${name}.schema.required`}
        label="Required Field?"
        as={SwitchButtonWidget}
        value={isRequired}
        onChange={onRequiredChange}
      />

      {uiType.uiWidget === "textarea" && (
        <TextAreaFields
          uiOptionsPath={joinPathParts(
            name,
            "uiSchema",
            propertyName,
            "ui:options",
          )}
        />
      )}
    </div>
  );
};

export default FieldEditor;
