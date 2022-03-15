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

import { Theme as RjsfTheme } from "@rjsf/bootstrap-4";
import React from "react";
import { FormPreviewFieldProps } from "./FormPreviewFieldTemplate";
import { produce } from "immer";
import { SchemaDefinition } from "@/core";

const RjsfSchemaField = RjsfTheme.fields.SchemaField;

const FormPreviewSchemaField: React.FC<FormPreviewFieldProps> = (props) => {
  let fieldProps: FormPreviewFieldProps;

  // If we render a dropdown with @var value, use the name of the var and the single option
  if (typeof props.schema.oneOf === "string") {
    fieldProps = produce(props, (draft) => {
      draft.schema.oneOf = [
        {
          const: props.schema.oneOf,
        } as SchemaDefinition,
      ];

      draft.disabled = true;
    });
  } else if (typeof props.schema.enum === "string") {
    fieldProps = produce(props, (draft) => {
      draft.schema.enum = [props.schema.enum];
      draft.schema.default = props.schema.enum;
      draft.disabled = true;
    });
  } else {
    fieldProps = props;
  }

  return <RjsfSchemaField {...fieldProps} />;
};

export default FormPreviewSchemaField;
