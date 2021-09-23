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
  ElementType,
  ReactNode,
  useContext,
  FocusEvent,
  ChangeEventHandler,
} from "react";
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
  WidgetProps = FormControlProps,
  As = ElementType<WidgetProps>
> = WidgetProps & {
  name: string;
  label?: ReactNode;
  description?: ReactNode;
  layout?: "horizontal" | "vertical" | "switch";
  error?: string;
  touched?: boolean;
  value: string;
  as?: As;
  onBlur?: (event: FocusEvent<any>) => void;
};

export type WidgetProps<ControlElement = Element> = {
  name: string;
  isInvalid: boolean;
  value: string;
  onChange: ChangeEventHandler<ControlElement>;
};

/**
 * @deprecated just don't use. Define your own type
 */
export type CustomFieldWidget<TExtra = void> = TExtra;

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
      <input type="" />
      <BootstrapForm.Control
        name={name}
        isInvalid={isInvalid}
        as="textarea"
        value={nonUndefinedValue}
        // {...restFieldProps}
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

const RenderedSwitch: React.FC<Except<FieldProps, "layout">> = ({
  name,
  label,
  value = false,
  onChange,
}) => (
  <SwitchButton name={name} label={label} value={value} onChange={onChange} />
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
