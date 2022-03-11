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
  ExpressionWidget: React.VFC<SchemaFieldProps>;
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
  UnsupportedWidget: React.VFC<SchemaFieldProps>;
  WorkshopMessageWidget: React.VFC<Partial<SchemaFieldProps>>;
};
const UnsetWidget: React.VFC = () => null;

const widgetsRegistry: Widgets = {
  ArrayWidget: UnsetWidget,
  BooleanWidget: UnsetWidget,
  ExpressionWidget: UnsetWidget,
  IntegerWidget: UnsetWidget,
  NumberWidget: UnsetWidget,
  ObjectWidget: UnsetWidget,
  OmitFieldWidget: UnsetWidget,
  SchemaSelectWidget: UnsetWidget,
  TemplateToggleWidget: UnsetWidget,
  TextWidget: UnsetWidget,
  UnsupportedWidget: UnsetWidget,
  WorkshopMessageWidget: UnsetWidget,
};

export default widgetsRegistry;
