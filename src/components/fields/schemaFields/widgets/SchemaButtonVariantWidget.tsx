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

import React from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import SelectWidget, {
  type Option,
  type SelectLike,
} from "@/components/form/widgets/SelectWidget";
import { type UUID } from "@/types/stringTypes";
import { type OptionProps, type ValueContainerProps } from "react-select";
import { Button } from "react-bootstrap";
import styles from "./SchemaButtonVariantWidget.module.scss";
import cx from "classnames";
import { type SingleValueProps } from "react-select/dist/declarations/src/components/SingleValue";

const buttonVariants = [
  { value: "primary", label: "Primary" },
  { value: "outline-primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "outline-secondary", label: "Secondary" },
  { value: "success", label: "Success" },
  { value: "outline-success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "outline-warning", label: "Warning" },
  { value: "danger", label: "Danger" },
  { value: "outline-danger", label: "Danger" },
  { value: "info", label: "Info" },
  { value: "outline-info", label: "Info" },
  { value: "light", label: "Light" },
  { value: "outline-light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "outline-dark", label: "Dark" },
  { value: "link", label: "Link" },
  { value: "outline-link", label: "Link" },
];

interface OptionValue {
  value: string;
  label: string;
}

const OptionComponent = (props: OptionProps<OptionValue>) => {
  const { innerProps, innerRef, data, isSelected } = props;
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={cx(styles.optionContainer, { [styles.active]: isSelected })}
    >
      <Button
        type={null}
        variant={data.value}
        size="sm"
        className={styles.exampleButton}
      >
        {data.label}
      </Button>
    </div>
  );
};

const ValueComponent = (props: SingleValueProps<OptionValue>) => {
  const { data } = props;
  return (
    <Button
      type={null}
      variant={data.value}
      size="sm"
      className={styles.exampleButton}
    >
      {data.label}
    </Button>
  );
};

const ContainerComponent = (props: ValueContainerProps<OptionValue>) => {
  const { innerProps, children } = props;
  return (
    <div {...innerProps} className={styles.selectContainer}>
      {children}
    </div>
  );
};

const SchemaButtonVariantWidget: React.FunctionComponent<SchemaFieldProps> = ({
  name,
  uiSchema,
}) => {
  const [{ value }, , { setValue }] = useField<string>(name);
  const { isSearchable, isClearable } = uiSchema ?? {};

  return (
    <div className="mt-2">
      <SelectWidget<OptionValue>
        name={name}
        options={buttonVariants}
        value={value}
        isSearchable={isSearchable}
        isClearable={isClearable}
        onChange={(event: React.ChangeEvent<SelectLike<Option<UUID>>>) => {
          setValue(event.target.value);
        }}
        components={{
          Option: OptionComponent,
          SingleValue: ValueComponent,
          ValueContainer: ContainerComponent,
        }}
      />
    </div>
  );
};

export default SchemaButtonVariantWidget;
