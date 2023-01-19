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

import React, { type ReactNode } from "react";
import {
  Col,
  type ColProps,
  // eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
  Form as BootstrapForm,
  type FormControlProps,
  Row,
} from "react-bootstrap";
import styles from "./FieldTemplate.module.scss";
import cx from "classnames";
import { isEmpty, isPlainObject } from "lodash";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import LinkifiedString from "@/components/LinkifiedString";
import { AnnotationType } from "@/types";
import { type FieldAnnotation } from "@/components/form/FieldAnnotation";

export type FieldProps<As extends React.ElementType = React.ElementType> =
  FormControlProps &
    React.ComponentProps<As> & {
      name: string;
      label?: ReactNode;
      fitLabelWidth?: boolean;
      widerLabel?: boolean;
      description?: ReactNode;
      annotations?: FieldAnnotation[];
      touched?: boolean;

      /**
       * This value is regarded as absence of value, unset property.
       * It will be passed to the UI input control when the value is undefined.
       */
      blankValue?: unknown;
    };

type WidgetElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type CustomFieldWidgetProps<
  TValue = string | string[] | number,
  TInputElement = WidgetElement
> = {
  id?: string;
  name: string;
  disabled?: boolean;
  value: TValue;
  onChange: React.ChangeEventHandler<TInputElement>;
};
export type CustomFieldWidget<
  TValue = string | string[] | number,
  TInputElement = WidgetElement,
  TFieldWidgetProps extends CustomFieldWidgetProps<
    TValue,
    TInputElement
  > = CustomFieldWidgetProps<TValue, TInputElement>
> = React.ComponentType<TFieldWidgetProps>;

type ComputeLabelAndColSizeArgs = {
  fitLabelWidth: boolean;
  widerLabel: boolean;
  label: ReactNode;
};

export function computeLabelAndColSize({
  fitLabelWidth,
  widerLabel,
  label,
}: ComputeLabelAndColSizeArgs) {
  const labelSize: ColProps = {};
  const colSize: ColProps = {};

  if (fitLabelWidth) {
    labelSize.lg = "auto";
    colSize.lg = true;
  } else if (widerLabel) {
    labelSize.lg = "4";
    labelSize.xl = "3";
    colSize.lg = label ? "8" : "12";
    colSize.xl = label ? "9" : "12";
  } else {
    labelSize.lg = "3";
    labelSize.xl = "2";
    colSize.lg = label ? "9" : "12";
    colSize.xl = label ? "10" : "12";
  }

  return { labelSize, colSize };
}

const FieldTemplate: React.FC<FieldProps> = ({
  name,
  label,
  fitLabelWidth,
  widerLabel,
  description,
  annotations: untypedAnnotations,
  touched,
  value,
  children,
  blankValue = "",
  as: AsControl,
  className,
  ...restFieldProps
}) => {
  const annotations: FieldAnnotation[] = untypedAnnotations;
  const isInvalid = !isEmpty(
    annotations.filter((annotation) => annotation.type === AnnotationType.Error)
  );

  // Prevent undefined values to keep the HTML `input` tag from becoming uncontrolled
  const nonUndefinedValue = value === undefined ? blankValue : value;

  const isBuiltinControl =
    AsControl === undefined || typeof AsControl === "string";

  if (isBuiltinControl && isPlainObject(nonUndefinedValue)) {
    console.warn(
      "RenderedField received an object value to a built-in control",
      {
        as: AsControl,
        nonUndefinedValue,
        blankValue,
        value,
      }
    );
  }

  // Note on `controlId` and Bootstrap FormGroup.
  // If we set `controlId` on the Bootstrap FormGroup, we must not set `id` on `FormLabel` and `FormControl`.
  // This makes it impossible to use a FormControl as a CustomWidget,
  // because it gets both `controlId` from Group and `id` from props of `AsControl`.
  // See their logic at https://github.com/react-bootstrap/react-bootstrap/blob/v1.6.4/src/FormControl.tsx#L179:L182
  // The most simple solution is to manually set `htmlFor` on the Label and `id` on the Control.
  const controlId = name;

  const formControl = isBuiltinControl ? (
    <BootstrapForm.Control
      id={controlId}
      name={name}
      isInvalid={isInvalid}
      value={nonUndefinedValue}
      as={AsControl}
      {...restFieldProps}
    >
      {children}
    </BootstrapForm.Control>
  ) : (
    <AsControl
      id={controlId}
      name={name}
      isInvalid={isInvalid}
      value={nonUndefinedValue}
      {...restFieldProps}
    >
      {children}
    </AsControl>
  );

  const { labelSize, colSize } = computeLabelAndColSize({
    fitLabelWidth,
    widerLabel,
    label,
  });

  return (
    <BootstrapForm.Group as={Row} className={cx(styles.formGroup, className)}>
      {!isEmpty(annotations) && (
        <Col xs="12" className="mb-2">
          {annotations.map(({ message, type, actions }) => (
            <FieldAnnotationAlert
              key={`${type}-${message.slice(0, 10)}`}
              message={message}
              type={type}
              actions={actions}
            />
          ))}
        </Col>
      )}
      {label && (
        <BootstrapForm.Label
          column
          className={styles.label}
          htmlFor={controlId}
          {...labelSize}
        >
          {label}
        </BootstrapForm.Label>
      )}
      <Col {...colSize}>
        {formControl}
        {description && (
          <BootstrapForm.Text className="text-muted">
            <LinkifiedString>{description}</LinkifiedString>
          </BootstrapForm.Text>
        )}
      </Col>
    </BootstrapForm.Group>
  );
};

export default React.memo(FieldTemplate);
