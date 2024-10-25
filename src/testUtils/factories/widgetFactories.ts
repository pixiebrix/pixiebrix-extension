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

import { define } from "cooky-cutter";
import { type WidgetProps } from "@rjsf/utils";

export const widgetPropsFactory = define<WidgetProps>({
  id: (n: number) => `test-widget-${n}`,
  schema: {},
  value: "",
  required: false,
  disabled: false,
  readonly: false,
  autofocus: false,
  onChange: jest.fn(),
  onBlur: jest.fn(),
  onFocus: jest.fn(),
  label: (n: number) => `Test Widget ${n}`,
  multiple: false,
  rawErrors: [],
  options: {},
  name: (n: number) => `test-widget-${n}`,
  registry: {} as any,
});
