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

import React, { FocusEventHandler, ReactNode } from "react";
import {
  Col,
  Form as BootstrapForm,
  FormControlProps,
  Row,
} from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { withFormikField } from "./withFormikField";

export type HorizontalTextFieldProps = FormControlProps & {
  name: string;
  label?: string;
  placeholder?: string;
  description?: ReactNode;
  error?: string;
  touched?: boolean;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export const HorizontalTextField: React.FC<HorizontalTextFieldProps> = ({
  name,
  label,
  placeholder,
  description,
  error,
  touched,
  ...restFieldProps
}) => {
  const hasError = Boolean(error);
  return (
    <BootstrapForm.Group as={Row} controlId={name}>
      {label && (
        <BootstrapForm.Label column sm="2">
          {fieldLabel(label)}
        </BootstrapForm.Label>
      )}
      <Col sm={label ? "10" : "12"}>
        <BootstrapForm.Control
          name={name}
          placeholder={placeholder}
          isInvalid={hasError}
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

export default withFormikField(HorizontalTextField);
