/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import castArray from "lodash/castArray";
import { createSendScriptMessage } from "@/messaging/chrome";
import {
  READ_EMBER_COMPONENT,
  READ_EMBER_VIEW_ATTRS,
} from "@/messaging/constants";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

export interface EmberConfig {
  type: "emberjs";
  selector: string;
  attrs: string | string[];
}

export const withEmberComponentProps = createSendScriptMessage<ReaderOutput>(
  READ_EMBER_COMPONENT
);

export const withEmberViewAttrs = createSendScriptMessage<ReaderOutput>(
  READ_EMBER_VIEW_ATTRS
);

async function doRead(reader: EmberConfig): Promise<ReaderOutput> {
  const { attrs: rawAttrs, selector } = reader;
  const attrs = castArray(rawAttrs ?? []);
  const values = await withEmberViewAttrs({ selector, attrs });
  return attrs.length === 1 ? (values[attrs[0]] as ReaderOutput) : values;
}

registerFactory("emberjs", doRead);
