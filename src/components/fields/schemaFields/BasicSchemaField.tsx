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

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { FieldValidator, useField } from "formik";
import { isEmpty } from "lodash";
import FieldTemplate from "@/components/form/FieldTemplate";
import cx from "classnames";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { getToggleOptions } from "./getToggleOptions";
import widgetsRegistry from "./widgets/widgetsRegistry";
import useToggleFormField from "@/pageEditor/hooks/useToggleFormField";
import { isExpression } from "@/runtime/mapArgs";
import { getFieldValidator } from "../fieldUtils";

const BasicSchemaField: SchemaFieldComponent = ({
  omitIfEmpty = false,
  onBlur: onBlurProp,
  ...restProps
}) => {
  const {
    name,
    schema,
    validationSchema,
    isRequired,
    description,
    isObjectProperty = false,
    isArrayItem = false,
    hideLabel,
  } = restProps;
  const fieldLabel = makeLabelForSchemaField(restProps);
  const defaultDescription = useMemo(
    () => description ?? schema.description,
    [description, schema.description]
  );
  const [fieldDescription, setFieldDescription] =
    useState<React.ReactNode>(defaultDescription);

  const updateFieldDescription = useCallback(
    (newDescription: string | undefined) => {
      setFieldDescription(newDescription ?? defaultDescription);
    },
    [defaultDescription]
  );

  const { customToggleModes } = useContext(SchemaFieldContext);
  const { allowExpressions } = useContext(FieldRuntimeContext);

  const normalizedSchema = useMemo(() => {
    const isObjectType =
      schema.type === "object" ||
      !Object.prototype.hasOwnProperty.call(schema, "type");

    if (
      isObjectType &&
      schema.properties === undefined &&
      schema.additionalProperties === undefined &&
      schema.oneOf === undefined &&
      schema.anyOf === undefined &&
      schema.allOf === undefined
    ) {
      return {
        ...schema,
        additionalProperties: true,
      };
    }

    return schema;
  }, [schema]);

  const inputModeOptions = useMemo(
    () =>
      getToggleOptions({
        fieldSchema: normalizedSchema,
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem,
        allowExpressions,
      }),
    [
      normalizedSchema,
      isRequired,
      customToggleModes,
      isObjectProperty,
      isArrayItem,
      allowExpressions,
    ]
  );

  const validate = getFieldValidator(validationSchema);

  const [{ value, onBlur: formikOnBlur }, { error, touched }, { setValue }] =
    useField({
      name,
      validate,
    });

  useEffect(() => {
    // Initialize any undefined required fields to prevent inferring an "omit" input
    if (value === undefined && isRequired && !isEmpty(inputModeOptions)) {
      setValue(inputModeOptions[0].interpretValue(value));
    }
    // We only want to run this on mount, but also for some reason, sometimes the formik
    // helpers reference (setValue) changes, so we need to account for that in the dependencies
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/2269
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]);

  const { onOmitField } = useToggleFormField(name, normalizedSchema);

  if (isEmpty(inputModeOptions)) {
    return (
      <FieldTemplate
        name={name}
        label={fieldLabel}
        description={fieldDescription}
        error={error}
        touched={touched}
        as={widgetsRegistry.UnsupportedWidget}
      />
    );
  }

  const onBlur = (event: React.FocusEvent) => {
    formikOnBlur(event);

    if (
      omitIfEmpty &&
      (isEmpty(value) || (isExpression(value) && isEmpty(value.__value__)))
    ) {
      onOmitField();
    }

    onBlurProp?.(event);
  };

  return (
    <FieldTemplate
      name={name}
      label={fieldLabel}
      description={fieldDescription}
      error={error}
      touched={touched}
      className={cx({ "mb-0": hideLabel })} // Remove bottom margin if we're already hiding the label
      as={widgetsRegistry.TemplateToggleWidget}
      inputModeOptions={inputModeOptions}
      setFieldDescription={updateFieldDescription}
      onBlur={onBlur}
      {...restProps}
      // Pass in schema after spreading props to override the non-normalized schema in props
      schema={normalizedSchema}
    />
  );
};

export default BasicSchemaField;
