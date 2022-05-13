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
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectAuth } from "@/auth/authSelectors";
import SelectWidget, {
  makeStringOptions,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { split } from "lodash";
import { RegistryId } from "@/core";
import { Form } from "react-bootstrap";
import styles from "./RegistryIdWidget.module.scss";
import { StylesConfig } from "react-select";
import { UserRole } from "@/types/contract";

const editorRoles = new Set<number>([
  UserRole.admin,
  UserRole.developer,
  UserRole.manager,
]);

/**
 * Splits a value into a scope and id, based on scope starting with @ and id
 *  as everything following the first / character
 * @param value the full RegistryId
 */
export function getScopeAndId(
  value: RegistryId
): [string | undefined, string | undefined] {
  // Scope needs to start with @
  if (!value.startsWith("@")) {
    return [undefined, value];
  }

  // If the value starts with @ and doesn't have a slash, interpret it as a scope
  if (!value.includes("/")) {
    return [value, undefined];
  }

  const [scope, ...idParts] = split(value, "/");
  return [scope, idParts.join("/")];
}

const RegistryIdWidget: React.VFC<{
  name: string;
  selectStyles: StylesConfig;
}> = ({ name, selectStyles }) => {
  const [{ value }, , { setValue, setTouched }] = useField<RegistryId>(name);
  const { scope: userScope, organizations } = useSelector(selectAuth);
  const organizationScopes = organizations
    .filter((organization) => editorRoles.has(organization.role))
    .map((organization) => organization.scope);

  const options = makeStringOptions(userScope, ...organizationScopes);

  const [scopeValue = userScope, idValue] = getScopeAndId(value);

  useEffect(() => {
    const fullValue = `${scopeValue}/${idValue}` as RegistryId;
    if (value !== fullValue) {
      setValue(fullValue, true);
    }
  }, [scopeValue, idValue, setValue, value]);

  const onChangeScope: SelectWidgetOnChange = (event) => {
    const newScope =
      options.find((option) => option.value === event.target.value)?.value ??
      scopeValue;
    const newValue = `${newScope}/${idValue}` as RegistryId;
    setValue(newValue);
    setTouched(true);
  };

  const onChangeId: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const newId = event.target.value;
    const newValue = `${scopeValue}/${newId}` as RegistryId;
    setValue(newValue);
    setTouched(true);
  };

  return (
    <div className={styles.root}>
      <SelectWidget
        name={name}
        value={scopeValue}
        isClearable={false}
        onChange={onChangeScope}
        options={options}
        className={styles.select}
        styles={selectStyles}
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
