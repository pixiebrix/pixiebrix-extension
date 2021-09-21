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

import React, { useState } from "react";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import { useField } from "formik";
import { UI_ORDER } from "./schemaFieldNames";
import { RJSFSchema } from "./formBuilderTypes";
import styles from "./FormBuilder.module.scss";

const FormBuilder: React.FC<{
  name: string;
}> = ({ name }) => {
  const [
    {
      value: { schema, uiSchema },
    },
  ] = useField<RJSFSchema>(name);

  const [activeField, setActiveField] = useState(() => {
    const firstInOrder =
      // eslint-disable-next-line security/detect-object-injection -- is a constant
      uiSchema?.[UI_ORDER]?.length > 1 ? uiSchema[UI_ORDER][0] : undefined;
    if (firstInOrder) {
      return firstInOrder;
    }

    const firstInProperties = Object.keys(schema?.properties || {})[0];
    if (firstInProperties) {
      return firstInProperties;
    }

    return "";
  });

  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <FormEditor
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
      <div className={styles.column}>
        <FormPreview
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
    </div>
  );
};

export default FormBuilder;
