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

import React, { ReactNode, useContext } from "react";
import {
  Col,
  Form as BootstrapForm,
  FormControlProps,
  Row,
} from "react-bootstrap";
import { Except } from "type-fest";
import SwitchButton from "@/components/form/switchButton/SwitchButton";
import styles from "./FieldTemplate.module.scss";
import FormTheme from "@/components/form/FormTheme";
import { getErrorMessage } from "@/errors";

export type FieldProps<
  As extends React.ElementType = React.ElementType
> = FormControlProps &
  React.ComponentProps<As> & {
    name: string;
    layout?: "horizontal" | "vertical" | "switch" | undefined;
    label?: string | ReactNode | undefined;
    description?: ReactNode | undefined;
    error?: string | undefined;
    touched?: boolean | undefined;
  };

export type CustomFieldWidget<TExtra = never> = React.ComponentType<
  FieldProps & TExtra
>;

type FieldRenderProps = Except<FieldProps, "layout">;

const RenderedField: React.FC<FieldProps> = ({
  name,
  layout,
  label,
  description,
  error,
  touched,
  value,
  children,
  ...restFieldProps
}) => {
  const isInvalid = touched && Boolean(error);
  const nonUndefinedValue = typeof value === "undefined" ? "" : value;

  return layout === "vertical" ? (
    <BootstrapForm.Group controlId={name} className={styles.verticalFormGroup}>
      {label && (
        <BootstrapForm.Label className={styles.verticalFormLabel}>
          {label}
        </BootstrapForm.Label>
      )}
      <BootstrapForm.Control
        name={name}
        isInvalid={isInvalid}
        value={nonUndefinedValue}
        {...restFieldProps}
      >
        {children}
      </BootstrapForm.Control>
      {description && (
        <BootstrapForm.Text className="text-muted">
          {description}
        </BootstrapForm.Text>
      )}
      {isInvalid && (
        <div className={styles.invalidMessage}>{getErrorMessage(error)}</div>
      )}
    </BootstrapForm.Group>
  ) : (
    <BootstrapForm.Group
      as={Row}
      controlId={name}
      className={styles.horizontalFormGroup}
    >
      {label && (
        <BootstrapForm.Label column lg="3">
          {label}
        </BootstrapForm.Label>
      )}
      <Col lg={label ? "9" : "12"}>
        <BootstrapForm.Control
          name={name}
          isInvalid={isInvalid}
          value={nonUndefinedValue}
          {...restFieldProps}
        >
          {children}
        </BootstrapForm.Control>
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

const RenderedSwitch: React.FC<FieldRenderProps> = ({
  name,
  label,
  value,
  onChange,
  checked,
}) => (
  <SwitchButton
    name={name}
    label={label}
    value={value}
    checked={checked}
    onChange={onChange}
  />
);

const FieldTemplate: React.FC<FieldProps> = ({ layout, ...restProps }) => {
  const theme = useContext(FormTheme);

  switch (layout ?? theme.layout) {
    case "switch":
      return <RenderedSwitch {...restProps} />;
    default:
      return <RenderedField layout={layout} {...restProps} />;
  }
};

export default FieldTemplate;
