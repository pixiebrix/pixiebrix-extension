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

import { useField } from "formik";
import React from "react";
import { useSelector } from "react-redux";
import { selectAuth } from "@/auth/authSelectors";
import SelectWidget, {
  makeStringOptions,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { split } from "lodash";
import { RegistryId } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { Form } from "react-bootstrap";
import styles from "./RegistryIdWidget.module.scss";

const RegistryIdWidget: React.VFC<{ name: string }> = ({ name }) => {
  const [{ value }, , { setValue }] = useField<RegistryId>(name);
  const { scope: userScope, organization } = useSelector(selectAuth);
  const orgScope = organization?.scope;

  const options = makeStringOptions(userScope, orgScope);

  const [scope, id] = split(value, "/", 2);

  const scopeValue = scope ?? userScope;

  const idValue = id ?? scope ?? "";

  const onChangeScope: SelectWidgetOnChange = (event) => {
    const newScope =
      options.find((option) => option.value === event.target.value)?.value ??
      scopeValue;
    const newValue = validateRegistryId(`${newScope}/${idValue}`);
    setValue(newValue);
  };

  const onChangeId: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const newId = event.target.value;
    const newValue = validateRegistryId(`${scopeValue}/${newId}`);
    setValue(newValue);
  };

  return (
    <div className={styles.root}>
      <SelectWidget
        name={name}
        value={scopeValue}
        isClearable={false}
        onChange={onChangeScope}
        options={options}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null,
        }}
        className={styles.select}
      />
      <span> / </span>
      <Form.Control
        value={idValue}
        onChange={onChangeId}
        className={styles.idInput}
      />
    </div>
  );
};

export default RegistryIdWidget;
