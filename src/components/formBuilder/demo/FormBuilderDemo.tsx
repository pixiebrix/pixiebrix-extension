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

import styles from "./FormBuilder.module.scss";

import React, { useState } from "react";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import FormIntroFields from "@/components/formBuilder/edit/FormIntroFields";
import FormPreview from "../preview/FormPreview";
import { useField } from "formik";
import { type RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";

/**
 * FormBuilderDemo is a demo component that shows the form editor and preview side by side, for use with Storybook and
 * unit testing. In practice, these two components (the editor and preview components) are separated into different
 * views in the Page Editor (the Brick Configuration pane and the Data Panel respectively).
 */
const FormBuilderDemo: React.FC<{
  name: string;
  initialActiveField?: string;
}> = ({ name, initialActiveField = null }) => {
  const [activeField, setActiveField] = useState<string | null>(
    initialActiveField,
  );
  const [{ value: rjsfSchema }] = useField<RJSFSchema>(name);

  return (
    <div className={styles.root}>
      <div className={styles.column} data-testid="editor">
        <FormIntroFields name={name} />
        <FormEditor
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
          fieldTypes={FORM_FIELD_TYPE_OPTIONS}
        />
      </div>
      <div className={styles.column} data-testid="preview">
        <FormPreview
          rjsfSchema={rjsfSchema}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
    </div>
  );
};

export default FormBuilderDemo;
