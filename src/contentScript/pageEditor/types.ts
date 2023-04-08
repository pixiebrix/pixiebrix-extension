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

import {
  type ExtensionPointConfig,
  type ExtensionPointDefinition,
  type ExtensionPointType,
} from "@/extensionPoints/types";
import { EmptyObject, type Except } from "type-fest";
import {
  type PanelConfig,
  type PanelDefinition,
} from "@/extensionPoints/panelExtension";
import {
  type MenuDefinition,
  type MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { type ElementInfo } from "@/pageScript/frameworks";
import { IExtension } from "@/types/extensionTypes";
import { UnknownObject } from "@/types/objectTypes";
import { UUID } from "@/types/stringTypes";

export interface DynamicDefinition<
  TExtensionPoint extends ExtensionPointDefinition = ExtensionPointDefinition,
  TExtension extends UnknownObject = EmptyObject
> {
  type: ExtensionPointType;
  extensionPointConfig: ExtensionPointConfig<TExtensionPoint>;
  extension: IExtension<TExtension>;
}

export type SelectMode = "element" | "container";
export type PanelSelectionResult = {
  uuid: UUID;
  foundation: Except<
    PanelDefinition,
    "defaultOptions" | "isAvailable" | "reader"
  >;
  panel: Except<PanelConfig, "body">;
  containerInfo: ElementInfo;
};
export type ButtonDefinition = DynamicDefinition<
  MenuDefinition,
  MenuItemExtensionConfig
>;
export type ButtonSelectionResult = {
  uuid: UUID;
  menu: Except<MenuDefinition, "defaultOptions" | "isAvailable" | "reader">;
  item: Pick<MenuItemExtensionConfig, "caption">;
  containerInfo: ElementInfo;
};
