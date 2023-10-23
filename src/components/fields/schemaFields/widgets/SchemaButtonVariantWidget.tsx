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

import React, { useMemo } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import { type Option } from "@/components/form/widgets/SelectWidget";
import Select, {
  type OptionProps,
  type ValueContainerProps,
} from "react-select";
import { Button } from "react-bootstrap";
import styles from "./SchemaButtonVariantWidget.module.scss";
import cx from "classnames";
import { type SingleValueProps } from "react-select/dist/declarations/src/components/SingleValue";
import { type StringOption } from "@/components/fields/schemaFields/widgets/SchemaSelectWidget";
import { mapSchemaToOptions } from "@/components/fields/schemaFields/selectFieldUtils";

const OptionComponent = ({
  innerProps,
  innerRef,
  data,
  isSelected,
}: OptionProps<Option>) => (
  <div
    ref={innerRef}
    {...innerProps}
    className={cx(styles.optionContainer, { [styles.active]: isSelected })}
  >
    <Button
      data-testid="variant-option"
      type={null}
      variant={data.value}
      size="sm"
      className={styles.exampleButton}
    >
      {data.label}
    </Button>
  </div>
);

const ValueComponent = ({ data }: SingleValueProps<Option>) => (
  <Button
    data-testid="selected-variant"
    type={null}
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
}: ValueContainerProps<Option>) => (
  <div {...innerProps} className={styles.selectContainer}>
    {children}
  </div>
);

const SchemaButtonVariantWidget: React.FunctionComponent<SchemaFieldProps> = ({
  name,
  schema,
}) => {
  const [{ value }, , { setValue }] = useField(name);
  const { options } = useMemo(
    () => mapSchemaToOptions({ schema, value }),
    [schema, value]
  );

  const selectedValue = options.find((x) => x.value === value) ?? {
    label: null,
    value: null,
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
