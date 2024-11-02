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

import { type FormControlProps } from "react-bootstrap";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import type React from "react";
import { type TemplateToggleWidgetProps } from "./templateToggleWidgetTypes";
import { type IntegrationDependencyWidgetProps } from "@/components/fields/schemaFields/integrations/IntegrationDependencyWidget";

type Widgets = {
  ArrayWidget: React.FC<SchemaFieldProps>;
  BooleanWidget: React.FC<SchemaFieldProps>;
  IntegerWidget: React.FC<SchemaFieldProps & FormControlProps>;
  NumberWidget: React.FC<
    SchemaFieldProps &
      FormControlProps & {
        step?: number;
      }
  >;
  ObjectWidget: React.FC<SchemaFieldProps>;
  FixedInnerObjectWidget: React.FC<SchemaFieldProps>;
  OmitFieldWidget: React.FC<SchemaFieldProps & FormControlProps>;
  SchemaSelectWidget: React.FC<SchemaFieldProps>;
  TemplateToggleWidget: React.FC<TemplateToggleWidgetProps>;
  TextWidget: React.FC<SchemaFieldProps & FormControlProps>;
  CssClassWidget: React.FC<SchemaFieldProps>;
  UnsupportedWidget: React.FC<SchemaFieldProps>;
  UrlMatchPatternWidget: React.FC<SchemaFieldProps & FormControlProps>;
  UrlPatternWidget: React.FC<SchemaFieldProps>;
  SelectorMatchWidget: React.FC<SchemaFieldProps>;
  WorkshopMessageWidget: React.FC<Partial<SchemaFieldProps>>;
  DatabaseWidget: React.FC<{ name: string }>;
  PasswordWidget: React.FC<SchemaFieldProps & FormControlProps>;
  IconWidget: React.FC<SchemaFieldProps & FormControlProps>;
  ServiceWidget: React.FC<IntegrationDependencyWidgetProps>;
  SpreadsheetPickerWidget: React.FC<SchemaFieldProps>;
};

function unsetWidgetFactory(label: string): React.FC {
  const UnsetWidget: React.FC = () => {
    throw new Error(
      `Input widget ${label} not set. Did you forget to register it in registerDefaultWidgets?`,
    );
  };

  return UnsetWidget;
}

/**
 * The container that holds references to all the widgets.
 * This is used to avoid circular dependencies.
 * When you add a new widget, add it here, register in the `registerDefaultWidgets` function.
 */
const widgetsRegistry: Widgets = {
  ArrayWidget: unsetWidgetFactory("ArrayWidget"),
  BooleanWidget: unsetWidgetFactory("BooleanWidget"),
  IntegerWidget: unsetWidgetFactory("IntegerWidget"),
  NumberWidget: unsetWidgetFactory("NumberWidget"),
  ObjectWidget: unsetWidgetFactory("ObjectWidget"),
  FixedInnerObjectWidget: unsetWidgetFactory("FixedInnerObjectWidget"),
  OmitFieldWidget: unsetWidgetFactory("OmitFieldWidget"),
  SchemaSelectWidget: unsetWidgetFactory("SchemaSelectWidget"),
  TemplateToggleWidget: unsetWidgetFactory("TemplateToggleWidget"),
  TextWidget: unsetWidgetFactory("TextWidget"),
  CssClassWidget: unsetWidgetFactory("CssClassWidget"),
  UnsupportedWidget: unsetWidgetFactory("UnsupportedWidget"),
  UrlMatchPatternWidget: unsetWidgetFactory("UrlMatchPatternWidget"),
  UrlPatternWidget: unsetWidgetFactory("UrlPatternWidget"),
  SelectorMatchWidget: unsetWidgetFactory("SelectorMatchWidget"),
  WorkshopMessageWidget: unsetWidgetFactory("WorkshopMessageWidget"),
  DatabaseWidget: unsetWidgetFactory("DatabaseWidget"),
  PasswordWidget: unsetWidgetFactory("PasswordWidget"),
  IconWidget: unsetWidgetFactory("IconWidget"),
  ServiceWidget: unsetWidgetFactory("ServiceWidget"),
  SpreadsheetPickerWidget: unsetWidgetFactory("SpreadsheetPickerWidget"),
};

export default widgetsRegistry;
