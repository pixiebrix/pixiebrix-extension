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

import React, { ReactElement, ReactNode } from "react";
import { Col, Form as BootstrapForm, FormControlProps, Row } from "react-bootstrap";
import { Except } from "type-fest";

export type FieldProps<As extends React.ElementType = React.ElementType>
  = FormControlProps
  & React.ComponentProps<As>
  & {
    name: string;
    layout?: "horizontal" | "vertical" | undefined;
    label?: string | ReactNode | undefined;
    description?: ReactNode | undefined;
    error?: string | undefined;
    touched?: boolean | undefined;
  };

type FieldRenderProps = Except<FieldProps, "layout">;

const renderHorizontal: (props: FieldRenderProps) => ReactElement = ({
  name,
  label,
  description,
  error,
  touched,
  ...restFieldProps
}) => {
  const hasError = Boolean(error);

  return (
    <BootstrapForm.Group as={Row} controlId={name}>
      {label && (
        <BootstrapForm.Label column sm="3">
          {label}
        </BootstrapForm.Label>
      )}
      <Col sm={label ? "9" : "12"}>
        <BootstrapForm.Control
          name={name}
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
}

const renderVertical: (props: FieldRenderProps) => ReactElement = ({
  name,
  label,
  description,
  error,
  touched,
  ...restFieldProps
}) => {
  const hasError = Boolean(error);

  return (
    <BootstrapForm.Group as={Col} controlId={name}>
      {label && (
        <BootstrapForm.Label as={Row}>
          {label}
        </BootstrapForm.Label>
      )}
      <Row>
        <BootstrapForm.Control
          name={name}
          isInvalid={hasError}
          {...restFieldProps}
        />
      </Row>
      {description && (
        <BootstrapForm.Text as={Row} className="text-muted">
          {description}
        </BootstrapForm.Text>
      )}
      {touched && hasError && (
        <BootstrapForm.Control.Feedback as={Row} type="invalid">
          {error}
        </BootstrapForm.Control.Feedback>
      )}
    </BootstrapForm.Group>
  );
}

const Field: React.FC<FieldProps> = ({
  layout = "horizontal",
  ...restProps
}) => layout === "horizontal"
  ? renderHorizontal(restProps)
  : renderVertical(restProps);

export default Field;
