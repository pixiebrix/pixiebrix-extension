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

import { fromJS as deserializeButton } from "@/starterBricks/button/buttonStarterBrick";
import { fromJS as deserializeTrigger } from "@/starterBricks/trigger/triggerStarterBrick";
import { fromJS as deserializeContextMenu } from "@/starterBricks/contextMenu/contextMenuStarterBrick";
import { fromJS as deserializeSidebar } from "@/starterBricks/sidebar/sidebarStarterBrick";
import { fromJS as deserializeQuickBar } from "@/starterBricks/quickBar/quickBarStarterBrick";
import { fromJS as deserializeDynamicQuickBar } from "@/starterBricks/dynamicQuickBar/dynamicQuickBarStarterBrick";
import {
  type StarterBrick,
  type StarterBrickType,
} from "@/types/starterBrickTypes";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { getPlatform } from "@/platform/platformContext";
import { DefinitionKinds } from "@/types/registryTypes";
import { type PlatformProtocol } from "@/platform/platformProtocol";

type Factory = (
  platform: PlatformProtocol,
  definition: StarterBrickDefinitionLike,
) => StarterBrick;

const TYPE_MAP: Record<StarterBrickType, Factory> = {
  menuItem: deserializeButton,
  trigger: deserializeTrigger,
  contextMenu: deserializeContextMenu,
  actionPanel: deserializeSidebar,
  quickBar: deserializeQuickBar,
  quickBarProvider: deserializeDynamicQuickBar,
} as const;

export function fromJS(definition: StarterBrickDefinitionLike): StarterBrick {
  if (definition.kind !== DefinitionKinds.STARTER_BRICK) {
    // Is `never` due to check, but needed because this method is called dynamically
    const exhaustiveCheck: never = definition.kind;
    throw new Error(
      `Expected kind ${DefinitionKinds.STARTER_BRICK}, got ${exhaustiveCheck}`,
    );
  }

  if (!Object.hasOwn(TYPE_MAP, definition.definition.type)) {
    throw new Error(
      `Unexpected starter brick type: ${definition.definition.type}`,
    );
  }

  return TYPE_MAP[definition.definition.type](getPlatform(), definition);
}
