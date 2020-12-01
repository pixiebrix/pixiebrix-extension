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

import { fromJS as deserializePanel } from "@/extensionPoints/panelExtension";
import { fromJS as deserializeMenuItem } from "@/extensionPoints/menuItemExtension";
import { fromJS as deserializeTrigger } from "@/extensionPoints/triggerExtension";
import { fromJS as deserializeSelectionAction } from "@/extensionPoints/contextMenu";
import { IExtensionPoint } from "@/core";
import { ExtensionPointConfig } from "@/extensionPoints/types";

const TYPE_MAP = {
  panel: deserializePanel,
  menuItem: deserializeMenuItem,
  trigger: deserializeTrigger,
  contextMenu: deserializeSelectionAction,
};

export function fromJS(config: ExtensionPointConfig): IExtensionPoint {
  if (config.kind !== "extensionPoint") {
    throw new Error(`Expected kind extensionPoint, got ${config.kind}`);
  }

  if (!Object.prototype.hasOwnProperty.call(TYPE_MAP, config.definition.type)) {
    throw new Error(
      `Unexpected extension point type ${config.definition.type}`
    );
  }

  return TYPE_MAP[config.definition.type](config as any);
}
