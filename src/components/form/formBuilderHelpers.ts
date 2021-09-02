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

import { Schema } from "@/core";
import { FormConfig, FormField, FormFieldType } from "./formBuilderTypes";

export const buildFormConfigFromSchema = (formSchema: Schema): FormConfig => {
  const formConfig = {
    title: formSchema.title,
    fields: Object.entries(formSchema.properties).map(
      ([name, { type, title }]: [string, Schema]) => {
        const formField: FormField = {
          name,
          type: type as FormFieldType,
          title,
        };
        return formField;
      }
    ),
  };

  return formConfig;
};

export const buildFormSchemaFromConfig = (
  currentSchema: Schema,
  formConfig: FormConfig
): Schema => {
  const nextSchema = { ...currentSchema };
  nextSchema.title = formConfig.title;
  nextSchema.properties = {};

  for (const fieldConfig of formConfig.fields) {
    nextSchema.properties[fieldConfig.name] = {
      type: fieldConfig.type || "string",
      title: fieldConfig.title || fieldConfig.name,
    };
  }

  return nextSchema;
};
