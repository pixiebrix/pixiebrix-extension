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

import ArrayWidget from "./ArrayWidget";
import BooleanWidget from "./BooleanWidget";
import ExpressionWidget from "./ExpressionWidget";
import IntegerWidget from "./IntegerWidget";
import NumberWidget from "./NumberWidget";
import ObjectWidget from "./ObjectWidget";
import OmitFieldWidget from "./OmitFieldWidget";
import SchemaSelectWidget from "./SchemaSelectWidget";
import TemplateToggleWidget from "./TemplateToggleWidget";
import TextWidget from "./TextWidget";
import UnsupportedWidget from "./UnsupportedWidget";
import widgetsRegistry from "./widgetsRegistry";
import WorkshopMessageWidget from "./WorkshopMessageWidget";

function registerDefaultWidgets() {
  widgetsRegistry.ArrayWidget = ArrayWidget;
  widgetsRegistry.BooleanWidget = BooleanWidget;
  // not used
  widgetsRegistry.ExpressionWidget = ExpressionWidget;
  widgetsRegistry.IntegerWidget = IntegerWidget;
  widgetsRegistry.NumberWidget = NumberWidget;
  widgetsRegistry.ObjectWidget = ObjectWidget;
  widgetsRegistry.OmitFieldWidget = OmitFieldWidget;
  widgetsRegistry.SchemaSelectWidget = SchemaSelectWidget;
  // not used
  widgetsRegistry.TemplateToggleWidget = TemplateToggleWidget;
  widgetsRegistry.TextWidget = TextWidget;
  // not used
  widgetsRegistry.UnsupportedWidget = UnsupportedWidget;
  widgetsRegistry.WorkshopMessageWidget = WorkshopMessageWidget;
}

export default registerDefaultWidgets;
