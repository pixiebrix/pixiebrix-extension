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

import { Schema } from "@/core";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import { InputModeOption } from "@/components/fields/schemaFields/widgets/templateToggleWidgetTypes";

/**
 * A form field, including label, error message, etc.
 */
type CustomField = {
  match: (fieldSchema: Schema) => boolean;
  Component: SchemaFieldComponent;
};
/**
 * An individual form control (excluding label, error message, etc.)
 */
type CustomWidget = {
  match: (fieldSchema: Schema) => boolean;
  Component: SchemaFieldComponent;
};
export type CustomFieldToggleMode = {
  match: (fieldSchema: Schema) => boolean;
  option: InputModeOption;
};
export type CustomFieldDefinitions = {
  customFields: CustomField[];
  customWidgets: CustomWidget[];
  customToggleModes: CustomFieldToggleMode[];
};
