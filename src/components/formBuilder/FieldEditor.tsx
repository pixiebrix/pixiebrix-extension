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

import { Schema, UiSchema } from "@/core";
import { useField } from "formik";
import React, { ChangeEventHandler, useState } from "react";
import FormikHorizontalField from "../form/fields/FormikHorizontalField";
import HorizontalField from "../form/fields/HorizontalField";
import styles from "./FieldEditor.module.scss";

const FieldEditor: React.FC<{
  name: string;
  fieldName: string;
}> = ({ name, fieldName }) => {
  const [{ value }, , { setValue }] = useField(`${name}.schema.properties`);

  const onFieldNameChange = (event: ChangeEventHandler<HTMLInputElement>) => {
    const nextName = event.target.value;

    const next = { ...value };
    next[nextName] = next[fieldName];
    delete next[fieldName];

    setValue(next);
    console.log("onChange", event.target.value, value, next);
  };

  return (
    <div className={styles.active}>
      <HorizontalField
        name={`${name}.${fieldName}`}
        label="Field name"
        value={fieldName}
        onChange={onFieldNameChange}
      />
      <FormikHorizontalField
        name={`${name}.schema.properties.${fieldName}.title`}
        label="Title"
      />
    </div>
  );
};

export default FieldEditor;
