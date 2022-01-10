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

import { Field, FieldProps } from "@rjsf/core";
import React from "react";
import { SetActiveField } from "./formBuilderTypes";
import { UI_SCHEMA_ACTIVE } from "./schemaFieldNames";
import styles from "./FormPreviewFieldTemplate.module.scss";
import cx from "classnames";

export interface FormPreviewFieldProps extends FieldProps {
  setActiveField: SetActiveField;
}

interface FormPreviewFieldTemplateProps extends FormPreviewFieldProps {
  as: Field;
  className?: string;
}

const FormPreviewFieldTemplate: React.FC<FormPreviewFieldTemplateProps> = ({
  setActiveField,
  as: FieldComponent,
  className,
  ...rest
}) => {
  const { name, uiSchema = {} } = rest;
  // eslint-disable-next-line security/detect-object-injection -- is a constant
  const isActive = Boolean(uiSchema[UI_SCHEMA_ACTIVE]);

  const onClick = () => {
    if (!isActive) {
      setActiveField(name);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- TODO
    <div
      onClick={onClick}
      className={cx(styles.root, className, { [styles.isActive]: isActive })}
      role="group"
    >
      <FieldComponent {...rest} />
    </div>
  );
};

export default FormPreviewFieldTemplate;
