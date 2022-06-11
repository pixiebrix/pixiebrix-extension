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

import { FormControlProps } from "react-bootstrap";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import React from "react";
import { TemplateToggleWidgetProps } from "./templateToggleWidgetTypes";

type Widgets = {
  ArrayWidget: React.VFC<SchemaFieldProps>;
  BooleanWidget: React.VFC<SchemaFieldProps>;
  IntegerWidget: React.VFC<SchemaFieldProps & FormControlProps>;
  NumberWidget: React.VFC<
    SchemaFieldProps &
      FormControlProps & {
        step?: number;
      }
  >;
  ObjectWidget: React.VFC<SchemaFieldProps>;
  OmitFieldWidget: React.VFC<SchemaFieldProps & FormControlProps>;
  SchemaSelectWidget: React.VFC<SchemaFieldProps>;
  TemplateToggleWidget: React.VFC<TemplateToggleWidgetProps>;
  TextWidget: React.VFC<SchemaFieldProps & FormControlProps>;
  CssClassWidget: React.VFC<SchemaFieldProps>;
  UnsupportedWidget: React.VFC<SchemaFieldProps>;
  UrlMatchPatternWidget: React.VFC<SchemaFieldProps & FormControlProps>;
  UrlPatternWidget: React.VFC<SchemaFieldProps>;
  SelectorMatchWidget: React.VFC<SchemaFieldProps>;
  WorkshopMessageWidget: React.VFC<Partial<SchemaFieldProps>>;
};

function unsetWidgetFactory(label: string): React.VFC {
  const UnsetWidget: React.VFC = () => {
    throw new Error(
      `Input widget ${label} not set. Did you forget to register it in registerDefaultWidgets?`
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
};

export default widgetsRegistry;
