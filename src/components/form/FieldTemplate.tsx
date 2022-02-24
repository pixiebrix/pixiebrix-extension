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

import React, { ReactNode } from "react";
import {
  Col,
  ColProps,
  Form as BootstrapForm,
  FormControlProps,
  FormLabelProps,
  Row,
} from "react-bootstrap";
import styles from "./FieldTemplate.module.scss";
import { getErrorMessage } from "@/errors";
import cx from "classnames";
import { isPlainObject } from "lodash";

export type FieldProps<As extends React.ElementType = React.ElementType> =
  FormControlProps &
    React.ComponentProps<As> & {
      name: string;
      label?: ReactNode;
      fitLabelWidth?: boolean;
      description?: ReactNode;
      error?: string;
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

const FieldTemplate: React.FC<FieldProps> = ({
  name,
  label,
  fitLabelWidth,
  description,
  error,
  touched,
  value,
  children,
  blankValue = "",
  as: AsControl,
  className,
  ...restFieldProps
}) => {
  const isInvalid = touched && Boolean(error);

  // Prevent undefined values to keep the HTML `input` tag from becoming uncontrolled
  const nonUndefinedValue = typeof value === "undefined" ? blankValue : value;

  const isBuiltinControl =
    typeof AsControl === "undefined" || typeof AsControl === "string";

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

  const labelProps: FormLabelProps = {
    column: true,
    className: styles.label,
    htmlFor: controlId,
  };

  if (fitLabelWidth) {
    labelProps.lg = "auto";
  } else {
    labelProps.lg = "3";
    labelProps.xl = "2";
  }

  const colProps: ColProps = {};

  if (fitLabelWidth) {
    colProps.lg = true;
  } else {
    colProps.lg = label ? "9" : "12";
    colProps.xl = label ? "10" : "12";
  }

  return (
    <BootstrapForm.Group as={Row} className={cx(styles.formGroup, className)}>
      {label && (
        <BootstrapForm.Label {...labelProps}>{label}</BootstrapForm.Label>
      )}
      <Col {...colProps}>
        {formControl}
        {description && (
          <BootstrapForm.Text className="text-muted">
            {description}
          </BootstrapForm.Text>
        )}
        {isInvalid && (
          <div className={styles.invalidMessage}>{getErrorMessage(error)}</div>
        )}
      </Col>
    </BootstrapForm.Group>
  );
};

export default React.memo(FieldTemplate);
