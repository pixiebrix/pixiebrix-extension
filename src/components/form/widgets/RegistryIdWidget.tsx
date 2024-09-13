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

import { useField } from "formik";
import React from "react";
import { useSelector } from "react-redux";
import { selectAuth } from "@/auth/authSelectors";
import SelectWidget, {
  type Option,
  type SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import { compact } from "lodash";
import { type RegistryId } from "@/types/registryTypes";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form } from "react-bootstrap";
import styles from "./RegistryIdWidget.module.scss";
import { type StylesConfig } from "react-select";
import { LegacyUserRole } from "@/data/model/UserRole";

import { getScopeAndId } from "@/utils/registryUtils";
import useAsyncEffect from "use-async-effect";
import { assertNotNullish } from "@/utils/nullishUtils";

const editorRoles = new Set<number>([
  LegacyUserRole.admin,
  LegacyUserRole.developer,
  LegacyUserRole.manager,
]);

const emptyObject = {} as const;

const RegistryIdWidget: React.VFC<{
  name: string;
  selectStyles?: StylesConfig;
}> = ({ name, selectStyles = emptyObject }) => {
  const [{ value }, , { setValue }] = useField<RegistryId>(name);
  const { scope: userScope, organizations } = useSelector(selectAuth);
  // XXX: We should eventually refactor RequireScope to pass the required (non-null) user scope down to children, or set a context value
  assertNotNullish(
    userScope,
    "This widget should only be used inside RequireScope, userScope should be defined",
  );
  const organizationScopes: string[] = compact(
    organizations.map(({ scope, role }) => {
      if (scope && editorRoles.has(role)) {
        return scope;
      }

      return null;
    }),
  );
  const scopes: string[] = [userScope, ...organizationScopes];
  const options: Option[] = scopes.map((scope) => ({
    label: scope,
    value: scope,
  }));

  const { scope: scopeValue = userScope, id: idValue } = getScopeAndId(value);

  useAsyncEffect(async () => {
    // Don't validate here with validateRegistryId(), that should be done through form validation
    const fullValue = `${scopeValue}/${idValue}` as RegistryId;
    if (value !== fullValue) {
      await setValue(fullValue, true);
    }
  }, [scopeValue, idValue, setValue, value]);

  const onChangeScope: SelectWidgetOnChange = async (event) => {
    const newScope =
      options.find((option) => option.value === event.target.value)?.value ??
      scopeValue;
    // Don't validate here with validateRegistryId(), that should be done through form validation
    const newValue = `${newScope}/${idValue}` as RegistryId;
    await setValue(newValue);
  };

  const onChangeId: React.ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const newId = event.target.value;
    // Don't validate here with validateRegistryId(), that should be done through form validation
    const newValue = `${scopeValue}/${newId}` as RegistryId;
    await setValue(newValue);
  };

  return (
    <div className={styles.root}>
      <SelectWidget
        // This doesn't impact formik because these widgets aren't connected to formik directly;
        // we need it for testing because the react-select element is hard to identify in tests - it
        // doesn't accept a top-level data-testid prop
        name={`${name}-scope`}
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
        data-testid={`registryId-${name}-id`}
      />
    </div>
  );
};

export default RegistryIdWidget;
