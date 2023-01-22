/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import UrlMatchPatternWidget from "./UrlMatchPatternWidget";
import UrlPatternWidget from "@/pageEditor/components/UrlPatternWidget";
import ArrayWidget from "./ArrayWidget";
import BooleanWidget from "./BooleanWidget";
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
import SelectorMatchWidget from "@/pageEditor/components/SelectorMatchWidget";
import CssClassWidget from "./CssClassWidget";
import DatabaseWidget from "./DatabaseWidget";
import PasswordWidget from "./PasswordWidget";
import IconWidget from "@/components/fields/IconWidget";

const defaultWidgets = {
  ArrayWidget,
  BooleanWidget,
  IntegerWidget,
  NumberWidget,
  ObjectWidget,
  OmitFieldWidget,
  SchemaSelectWidget,
  TemplateToggleWidget,
  TextWidget,
  UnsupportedWidget,
  UrlMatchPatternWidget,
  UrlPatternWidget,
  SelectorMatchWidget,
  CssClassWidget,
  WorkshopMessageWidget,
  DatabaseWidget,
  IconWidget,
  PasswordWidget,
} as const;

function registerDefaultWidgets() {
  Object.assign(widgetsRegistry, defaultWidgets);
  for (const [name, widget] of Object.entries(defaultWidgets)) {
    if (!widget) {
      throw new Error(
        `Error registering default widgets. ${name} is undefined. Is there a circular dependency?`
      );
    }
  }
}

export default registerDefaultWidgets;
