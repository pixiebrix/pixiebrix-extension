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

import { fromJS as deserializePanel } from "@/extensionPoints/panelExtension";
import { fromJS as deserializeMenuItem } from "@/extensionPoints/menuItemExtension";
import { fromJS as deserializeTrigger } from "@/extensionPoints/triggerExtension";
import { fromJS as deserializeContextMenu } from "@/extensionPoints/contextMenu";
import { fromJS as deserializeSidebar } from "@/extensionPoints/sidebarExtension";
import { fromJS as deserializeQuickBar } from "@/extensionPoints/quickBarExtension";
import { IExtensionPoint } from "@/core";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { hasOwnProp } from "@/utils/safeProps";

const TYPE_MAP = {
  panel: deserializePanel,
  menuItem: deserializeMenuItem,
  trigger: deserializeTrigger,
  contextMenu: deserializeContextMenu,
  actionPanel: deserializeSidebar,
  quickBar: deserializeQuickBar,
};

export function fromJS(config: ExtensionPointConfig): IExtensionPoint {
  if (config.kind !== "extensionPoint") {
    // Is `never` due to check, but needed because this method is called dynamically
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Expected kind extensionPoint, got ${config.kind}`);
  }

  if (!hasOwnProp(TYPE_MAP, config.definition.type)) {
    throw new Error(
      `Unexpected extension point type: ${config.definition.type}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the factory methods perform validation
  return TYPE_MAP[config.definition.type](config as any);
}
