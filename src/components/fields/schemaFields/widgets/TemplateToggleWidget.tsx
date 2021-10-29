/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useMemo } from "react";
import { inferInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import SelectWidget, {
  Option,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { Field, getIn, useField, useFormikContext } from "formik";
import { Expression, TemplateEngine } from "@/core";
import { Col, Form, Row } from "react-bootstrap";
import { isExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { produce } from "immer";
import {
  SchemaFieldComponent,
  SchemaFieldProps,
} from "@/components/fields/schemaFields/propTypes";
import { JSONSchema7Array } from "json-schema";
import LoadingWidget from "@/components/fields/schemaFields/widgets/LoadingWidget";
import styles from "./TemplateToggleWidget.module.scss";

interface InputModeOptionBase<
  As extends React.ElementType = React.ElementType
> {
  Widget: As;
  defaultValue?: unknown;
}

export type StringOption = InputModeOptionBase &
  Option<"string" | TemplateEngine> & {
    defaultValue: string | Expression;
  };
export type NumberOption = InputModeOptionBase &
  Option<"number"> & {
    defaultValue: number | Expression;
  };
export type BooleanOption = InputModeOptionBase &
  Option<"boolean"> & {
    defaultValue: boolean | Expression;
  };
export type ArrayOption = InputModeOptionBase &
  Option<"array"> & {
    defaultValue: JSONSchema7Array | Expression;
  };
export type ObjectOption = InputModeOptionBase &
  Option<"object"> & {
    defaultValue: UnknownObject | Expression;
  };
export type OmitOption = InputModeOptionBase & Option<"omit">;

export type InputModeOption =
  | StringOption
  | NumberOption
  | BooleanOption
  | ArrayOption
  | ObjectOption
  | OmitOption;

type TemplateToggleWidgetProps = SchemaFieldProps & {
  name: string;
  inputModeOptions: InputModeOption[];
  overrideWidget?: SchemaFieldComponent;
};

/**
 * Show a field toggle that lets a user choose the type of data input, along with the chosen input
 *
 * @param name The field name in form state
 * @param inputModeOptions Options for types of inputs allowed for this field
 * @param overrideWidget Widget that overrides the input for the "literal" data type input option (e.g. string, number, etc)
 * @param props SchemaFieldProps
 */
const TemplateToggleWidget: React.FC<TemplateToggleWidgetProps> = ({
  name,
  inputModeOptions,
  overrideWidget,
  ...props
}) => {
  const [{ value }, , { setValue }] = useField<unknown>(name);
  const fieldName = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1)
    : name;
  const parentFieldName = name.includes(".")
    ? name.slice(0, name.lastIndexOf("."))
    : undefined;
  const { values, setValues } = useFormikContext<UnknownObject>();
  const parentValues = parentFieldName
    ? getIn(values, parentFieldName)
    : values;

  const inputMode = useMemo(() => inferInputMode(parentValues, fieldName), [
    fieldName,
    parentValues,
  ]);

  const selectedOption = inputModeOptions.find((x) => x.value === inputMode);
  const Widget = overrideWidget ?? selectedOption?.Widget ?? LoadingWidget;

  const onModeChange: SelectWidgetOnChange<InputModeOption> = useCallback(
    ({ target: { value: newInputMode } }) => {
      const { defaultValue } = inputModeOptions.find(
        (x) => x.value === newInputMode
      );

      if (newInputMode === "omit") {
        const newFormState = produce(values, (draft) => {
          if (parentFieldName) {
            const parentField = getIn(draft, parentFieldName);
            if (parentField) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
              delete parentField[fieldName];
            }
          } else if (fieldName in values) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
            delete values[fieldName];
          }
        });
        setValues(newFormState);
        return;
      }

      // Already handled "omit" and returned above.
      // Also, template option defaultValues handle the object
      // structure already, so we can set the value directly here
      // for both literals and template inputs.
      setValue(defaultValue);
    },
    [fieldName, inputModeOptions, parentFieldName, setValue, setValues, values]
  );

  const onChangeForTemplate = useCallback(
    (templateEngine: TemplateEngine) => {
      const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        setValue({
          __type__: templateEngine,
          __value__: e.target.value,
        });
      };

      return onChange;
    },
    [setValue]
  );

  const field = useMemo(() => {
    if (isExpression(value)) {
      return (
        <Form.Control
          name={name}
          value={value.__value__}
          onChange={onChangeForTemplate(value.__type__)}
        />
      );
    }

    return <Field name={name} as={Widget} {...props} />;
  }, [Widget, name, onChangeForTemplate, props, value]);

  return (
    <Row>
      <Col lg="3" className={styles.selectCol}>
        <SelectWidget
          name={`${name}.inputModeSelector`}
          value={inputMode}
          options={inputModeOptions}
          onChange={onModeChange}
        />
      </Col>
      <Col lg="9">{field}</Col>
    </Row>
  );
};

export default TemplateToggleWidget;
