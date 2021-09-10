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

import React, {
  FocusEventHandler,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import {
  Col,
  Form as BootstrapForm,
  FormControlProps,
  Row,
} from "react-bootstrap";
import { WithFormikFieldDefaultProps } from "./withFormikField";

// FIXME: these should be "|", not "&", but it makes the typing more complex
type FieldProps = FormControlProps &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

export type HorizontalFieldProps<T = unknown> = WithFormikFieldDefaultProps<T> &
  FieldProps & {
    label?: string;
    placeholder?: string;
    description?: ReactNode;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    widget?: React.ComponentType<FieldProps>;
  };

const TextAreaWidget: React.FC<FieldProps> = (props: FormControlProps) => (
  <BootstrapForm.Control as="textarea" {...props} />
);

const getWidgetByType = (type: string) => {
  if (type === "textarea") {
    return TextAreaWidget;
  }

  return BootstrapForm.Control;
};

const HorizontalField: React.FC<HorizontalFieldProps> = ({
  name,
  label,
  description,
  error,
  touched,
  type = "text",
  widget,
  ...restFieldProps
}) => {
  const hasError = Boolean(error);
  const Widget = widget ?? getWidgetByType(type);

  return (
    <BootstrapForm.Group as={Row} controlId={name}>
      {label && (
        <BootstrapForm.Label column sm="3">
          {label}
        </BootstrapForm.Label>
      )}
      <Col sm={label ? "9" : "12"}>
        <Widget
          name={name}
          isInvalid={hasError}
          type={type}
          {...restFieldProps}
        />
        {description && (
          <BootstrapForm.Text className="text-muted">
            {description}
          </BootstrapForm.Text>
        )}
        {touched && hasError && (
          <BootstrapForm.Control.Feedback type="invalid">
            {error}
          </BootstrapForm.Control.Feedback>
        )}
      </Col>
    </BootstrapForm.Group>
  );
};

export default HorizontalField;
