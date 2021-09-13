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

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import { FieldProps, utils } from "@rjsf/core";
import React from "react";
import { SetActiveField } from "./formBuilderTypes";

interface FormPreviewStingFieldProps extends FieldProps {
  setActiveField: SetActiveField;
}

export const UI_SCHEMA_ACTIVE = "ui:active";

const RjsfStringField = utils.getDefaultRegistry().fields.StringField;

const FormPreviewStingField: React.FC<FormPreviewStingFieldProps> = ({
  setActiveField,
  ...rest
}) => {
  const { name, uiSchema = {} } = rest;
  const isActive = Boolean(uiSchema[UI_SCHEMA_ACTIVE]);

  return (
    <div
      onClick={() => {
        if (!isActive) {
          setActiveField(name);
        }
      }}
      style={
        isActive
          ? {
              border: "1px solid black",
            }
          : null
      }
      role="group"
    >
      <RjsfStringField {...rest} />
    </div>
  );
};

export default FormPreviewStingField;
