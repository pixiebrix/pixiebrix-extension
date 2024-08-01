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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema, SCHEMA_EMPTY_OBJECT } from "@/types/schemaTypes";
import * as sidebarController from "@/contentScript/sidebarController";
import { logPromiseDuration } from "@/utils/promiseUtils";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { expectContext } from "@/utils/expectContext";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class ShowSidebar extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/sidebar/show",
      "Show Sidebar",
      "Show/open the PixieBrix sidebar",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      panelHeading: {
        type: "string",
        // Should match the field label in SidebarConfiguration
        title: "Tab Title",
        description:
          "The tab to show in the sidebar. If not provided, defaults to a sidebar panel in this mod",
      },
      forcePanel: {
        type: "boolean",
        title: "Force Panel",
        description:
          "If the sidebar is already showing a panel, force switch the active panel (default=false)",
        default: false,
      },
    },
    [],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async effect(
    {
      panelHeading,
      forcePanel = false,
    }: BrickArgs<{
      panelHeading?: string;
      forcePanel?: boolean;
    }>,
    { meta: { modComponentRef } }: BrickOptions,
  ): Promise<void> {
    expectContext("contentScript");

    await sidebarController.showSidebar();

    void logPromiseDuration(
      "ShowSidebar:updateSidebar",
      sidebarController.updateSidebar({
        force: forcePanel,
        panelHeading,
        // ActivatePanelOptions currently expects undefined not null
        blueprintId: modComponentRef.modId ?? undefined,
      }),
    );
  }
}

export class HideSidebar extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/sidebar/hide",
      "Hide Sidebar",
      "Hide/close the PixieBrix sidebar",
    );
  }

  inputSchema: Schema = SCHEMA_EMPTY_OBJECT;

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async effect(): Promise<void> {
    expectContext("contentScript");
    sidebarController.hideSidebar();
  }
}

export class ToggleSidebar extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/sidebar/toggle",
      "Toggle Sidebar",
      "Toggle the PixieBrix sidebar open/closed",
    );
  }

  inputSchema: Schema = SCHEMA_EMPTY_OBJECT;

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async effect(): Promise<void> {
    expectContext("contentScript");

    await sidebarController.toggleSidebar();
  }
}
