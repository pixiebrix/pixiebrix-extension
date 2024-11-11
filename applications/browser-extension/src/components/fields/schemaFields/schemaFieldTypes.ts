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

import { type Schema } from "@/types/schemaTypes";
import { type InputModeOption } from "@/components/fields/schemaFields/widgets/templateToggleWidgetTypes";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import type React from "react";

export type CustomFieldToggleMode = {
  match: (fieldSchema: Schema) => boolean;
  option: InputModeOption;
};

export type CustomWidgetRegistry = {
  SchemaButtonVariantWidget: React.VFC<SchemaFieldProps>;
  SchemaCustomEventWidget: React.VFC<SchemaFieldProps>;
  CodeEditorWidget: React.VFC<SchemaFieldProps>;
};

export type CustomFieldDefinitions = {
  customToggleModes: CustomFieldToggleMode[];
  customWidgets: CustomWidgetRegistry;
};
