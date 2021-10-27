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

import React, { useCallback } from "react";
import { FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import SelectWidget, {
  Option,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { Field, getIn, useField, useFormikContext } from "formik";
import { TemplateEngine } from "@/core";
import { Col, Form, Row } from "react-bootstrap";
import { isExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { produce } from "immer";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";

interface InputModeOptionBase<
  As extends React.ElementType = React.ElementType
> {
  Widget: As;
}

export type StringOption = InputModeOptionBase &
  Option<"string" | TemplateEngine> & {
    defaultValue: string;
  };
export type NumberOption = InputModeOptionBase &
  Option<"number"> & {
    defaultValue: number;
  };
export type BooleanOption = InputModeOptionBase &
  Option<"boolean"> & {
    defaultValue: boolean;
  };
export type ArrayOption = InputModeOptionBase &
  Option<"array"> & {
    defaultValue: unknown[];
  };
export type ObjectOption = InputModeOptionBase &
  Option<"object"> & {
    defaultValue: UnknownObject;
  };
export type OmitOption = InputModeOptionBase &
  Option<"omit"> & {
    defaultValue: null;
  };

export type InputModeOption =
  | StringOption
  | NumberOption
  | BooleanOption
  | ArrayOption
  | ObjectOption
  | OmitOption;

interface TemplateToggleWidgetProps {
  name: string;
  inputModeOptions: InputModeOption[];
  overrideWidget?: SchemaFieldComponent;
}

function getInputModeForValue(value: unknown): FieldInputMode {
  if (value === undefined) {
    return "omit";
  }

  if (isExpression(value)) {
    return value.__type__;
  }

  if (Array.isArray(value)) {
    return "array";
  }

  const typeOf: string = typeof value;
  if (
    typeOf === "string" ||
    typeOf === "number" ||
    typeOf === "boolean" ||
    typeOf === "object"
  ) {
    return typeOf;
  }

  return "string";
}

const TemplateToggleWidget: React.FC<TemplateToggleWidgetProps> = ({
  name,
  inputModeOptions,
  overrideWidget,
}) => {
  const [{ value }, , { setValue }] = useField<unknown>(name);
  const fieldName = name.includes(".")
    ? name.slice(name.lastIndexOf("."))
    : name;
  const parentFieldName = name.includes(".")
    ? name.slice(0, name.lastIndexOf("."))
    : undefined;
  const { values, setValues } = useFormikContext<UnknownObject>();

  const inputMode = getInputModeForValue(value);
  const selectedOption = inputModeOptions.find((x) => x.value === inputMode);
  const Widget = overrideWidget ?? selectedOption.Widget;

  const onModeChange: SelectWidgetOnChange<InputModeOption> = useCallback(
    ({ target: { value: newInputMode } }) => {
      const { defaultValue } = inputModeOptions.find(
        (x) => x.value === newInputMode
      );

      if (
        ["string", "number", "boolean", "array", "object"].includes(
          newInputMode
        )
      ) {
        setValue(defaultValue);
      } else if (
        ["mustache", "nunjucks", "handlebars", "var"].includes(newInputMode)
      ) {
        setValue({
          __type__: newInputMode,
          __value__: "",
        });
      } else if (newInputMode === "omit") {
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
      }
    },
    [fieldName, inputModeOptions, parentFieldName, setValue, setValues, values]
  );

  const onChangeForTemplate = (templateEngine: TemplateEngine) => {
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      setValue({
        __type__: templateEngine,
        __value__: e.target.value,
      });
    };

    return onChange;
  };

  const field = isExpression(value) ? (
    <Form.Control
      name={name}
      value={value.__value__}
      onChange={onChangeForTemplate(value.__type__)}
    />
  ) : (
    <Field name={name} as={Widget} />
  );

  return (
    <Row>
      <Col lg="3">
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
