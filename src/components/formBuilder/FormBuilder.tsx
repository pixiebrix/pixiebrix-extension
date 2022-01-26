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

import React, { useState } from "react";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import styles from "./FormBuilder.module.scss";
import { useField } from "formik";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";

const FormBuilder: React.FC<{
  name: string;
}> = ({ name }) => {
  const [activeField, setActiveField] = useState<string>();
  const [{ value: rjsfSchema }] = useField<RJSFSchema>(name);

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
          rjsfSchema={rjsfSchema}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
    </div>
  );
};

export default FormBuilder;
