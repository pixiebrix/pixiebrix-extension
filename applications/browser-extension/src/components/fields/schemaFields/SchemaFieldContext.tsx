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

import { createContext } from "react";
import {
  type CustomWidgetRegistry,
  type CustomFieldDefinitions,
} from "./schemaFieldTypes";
import SchemaButtonVariantWidget from "./widgets/SchemaButtonVariantWidget";
import { SchemaCustomEventWidget } from "./widgets/SchemaCustomEventWidget";
import CodeEditorWidget from "./widgets/CodeEditorWidget";

export const customWidgets: CustomWidgetRegistry = {
  SchemaButtonVariantWidget,
  SchemaCustomEventWidget,
  CodeEditorWidget,
} as const;

/**
 * Context defining custom fields and widgets for schema-based fields.
 */
const SchemaFieldContext = createContext<CustomFieldDefinitions>({
  customToggleModes: [],
  customWidgets,
});

export default SchemaFieldContext;
