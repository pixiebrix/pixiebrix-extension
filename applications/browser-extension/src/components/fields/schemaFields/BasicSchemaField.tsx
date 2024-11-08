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

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type SchemaFieldComponent } from "./propTypes";
import { makeLabelForSchemaField } from "./schemaFieldUtils";
import SchemaFieldContext from "./SchemaFieldContext";
import { useField, useFormikContext } from "formik";
import { isEmpty } from "lodash";
import cx from "classnames";
import FieldRuntimeContext from "./FieldRuntimeContext";
import { getToggleOptions } from "./getToggleOptions";
import widgetsRegistry from "./widgets/widgetsRegistry";
import useToggleFormField from "@/hooks/useToggleFormField";
import { getFieldValidator } from "../fieldUtils";
import { isExpression } from "../../../utils/expressionUtils";
import useAsyncEffect from "use-async-effect";
import { type InputModeOption } from "./widgets/templateToggleWidgetTypes";
import FieldTemplate from "../../form/FieldTemplate";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";
import { useSelector } from "react-redux";
import { makeFieldAnnotationsForValue } from "../../form/makeFieldAnnotationsForValue";
import { isNullOrBlank } from "../../../utils/stringUtils";
import { AnnotationType } from "../../../types/annotationTypes";

/*
 *  This is a hack to fix the issue where the formik state is not updated correctly when the form is first rendered.
 *  We use the renderRef to ensure that we only run this on the second render.
 *  TODO: We should be setting the initialValues in Redux before rendering the form.
 */
function useSetInitialValueForField({
  name,
  isRequired,
  inputModeOptions,
}: {
  name: string;
  isRequired: boolean;
  inputModeOptions: InputModeOption[];
}) {
  const renderRef = useRef(false);
  const [{ value }, , { setValue }] = useField<unknown>(name);

  useEffect(() => {
    renderRef.current = true;
  }, []);

  useAsyncEffect(async () => {
    const [inputModeOption] = inputModeOptions;
    // Initialize any undefined required fields to prevent inferring an "omit" input
    if (
      value === undefined &&
      isRequired &&
      inputModeOption &&
      renderRef.current &&
      inputModeOption.interpretValue
    ) {
      await setValue(inputModeOption.interpretValue(value));
    }
    // We include setValue in the dependencies because sometimes the formik
    // helpers reference (setValue) changes, so we need to account for that in the dependencies
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/2269
    // XXX: Not sure if the above still applies in newer formik versions...
  }, [setValue, renderRef.current]);
}

const BasicSchemaField: SchemaFieldComponent = ({
  omitIfEmpty = false,
  onBlur: onBlurProp,
  ...restProps
}) => {
  const {
    name,
    schema,
    validationSchema,
    isRequired = false,
    description,
    isObjectProperty = false,
    isArrayItem = false,
    hideLabel,
  } = restProps;
  const fieldLabel = makeLabelForSchemaField(restProps);
  const defaultDescription = useMemo(
    () => description ?? schema.description,
    [description, schema.description],
  );
  const [fieldDescription, setFieldDescription] =
    useState<React.ReactNode>(defaultDescription);

  const updateFieldDescription = useCallback(
    (newDescription: React.ReactNode | undefined) => {
      setFieldDescription(newDescription ?? defaultDescription);
    },
    [defaultDescription],
  );

  const { customToggleModes } = useContext(SchemaFieldContext);
  const { allowExpressions } = useContext(FieldRuntimeContext);

  const normalizedSchema = useMemo(() => {
    const isObjectType =
      schema.type === "object" || !Object.hasOwn(schema, "type");

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
    ],
  );

  const validate = getFieldValidator(validationSchema);

  const [{ value, onBlur: formikOnBlur }, { touched, error }] =
    useField<unknown>({
      name,
      validate,
    });

  useSetInitialValueForField({ name, isRequired, inputModeOptions });

  const { onOmitField } = useToggleFormField(
    name,
    normalizedSchema,
    isRequired,
  );

  const onBlur = useCallback(
    (event: React.FocusEvent) => {
      formikOnBlur(event);

      if (
        omitIfEmpty &&
        (isEmpty(value) || (isExpression(value) && isEmpty(value.__value__)))
      ) {
        onOmitField();
      }

      onBlurProp?.(event);
    },
    [value, formikOnBlur, omitIfEmpty, onOmitField, onBlurProp],
  );

  const formik = useFormikContext();
  const { analysisAnnotationsSelectorForPath } = useContext(
    AnalysisAnnotationsContext,
  );
  const analysisAnnotations = useSelector(
    analysisAnnotationsSelectorForPath(name),
  );
  const fieldAnnotations = useMemo(
    () => makeFieldAnnotationsForValue(analysisAnnotations, value, formik),
    [analysisAnnotations, formik, value],
  );
  // Add formik error if present
  if (touched && typeof error === "string" && !isNullOrBlank(error)) {
    fieldAnnotations.push({
      message: error,
      type: AnnotationType.Error,
    });
  }

  if (isEmpty(inputModeOptions)) {
    return (
      <FieldTemplate
        name={name}
        label={fieldLabel}
        description={fieldDescription}
        annotations={fieldAnnotations}
        as={widgetsRegistry.UnsupportedWidget}
      />
    );
  }

  // Extract overridden props so they don't conflict
  const {
    schema: unusedPropSchema,
    description: unusedPropDescription,
    label: unusedPropLabel,
    ...restFieldTemplateProps
  } = restProps;

  return (
    <FieldTemplate
      className={cx({ "mb-0": hideLabel })} // Remove bottom margin if we're already hiding the label
      as={widgetsRegistry.TemplateToggleWidget}
      inputModeOptions={inputModeOptions}
      setFieldDescription={updateFieldDescription}
      onBlur={onBlur}
      schema={normalizedSchema}
      description={fieldDescription}
      label={fieldLabel}
      annotations={fieldAnnotations}
      {...restFieldTemplateProps}
    />
  );
};

export default BasicSchemaField;
