/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useMemo } from "react";
import { type SchemaFieldProps } from "../propTypes";
import { useField } from "formik";
import Select, {
  type OptionProps,
  type ValueContainerProps,
  type SingleValueProps,
} from "react-select";
import { Button } from "react-bootstrap";
import styles from "./SchemaButtonVariantWidget.module.scss";
import cx from "classnames";
import { type StringOption } from "./SchemaSelectWidget";
import { mapSchemaToOptions } from "../selectFieldUtils";

const OptionComponent = ({
  innerProps,
  innerRef,
  data,
  isSelected,
}: OptionProps<StringOption>) => (
  <div
    ref={innerRef}
    {...innerProps}
    className={cx(styles.optionContainer, {
      [styles.active ?? ""]: isSelected,
    })}
  >
    <Button
      data-testid="variant-option"
      variant={data.value}
      size="sm"
      className={styles.exampleButton}
    >
      {data.label}
    </Button>
  </div>
);

const ValueComponent = ({ data }: SingleValueProps<StringOption>) => (
  <Button
    data-testid="selected-variant"
    variant={data.value}
    size="sm"
    className={styles.exampleButton}
  >
    {data.label}
  </Button>
);

const ContainerComponent = ({
  innerProps,
  children,
}: ValueContainerProps<StringOption>) => (
  <div {...innerProps} className={styles.selectContainer}>
    {children}
  </div>
);

const SchemaButtonVariantWidget: React.FunctionComponent<SchemaFieldProps> = ({
  name,
  schema,
}) => {
  const [{ value }, , { setValue }] = useField<string | undefined>(name);
  const { options } = useMemo(
    () => mapSchemaToOptions({ schema, value }),
    [schema, value],
  );

  const selectedValue = options.find((x) => x.value === value) ?? {
    label: undefined,
    value: undefined,
  };

  return (
    <div className="mt-2" data-testid="select-container">
      <Select
        name={name}
        options={options}
        value={selectedValue}
        isSearchable={false}
        // Set clearable to false because the input looks off next to the button preview
        isClearable={false}
        onChange={async (event: StringOption) => {
          await setValue(event.value);
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
