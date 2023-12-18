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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema, SCHEMA_EMPTY_OBJECT } from "@/types/schemaTypes";
import { hideSidebar, showSidebar } from "@/contentScript/sidebarController";
import { propertiesToSchema } from "@/validators/generic";

import { logPromiseDuration } from "@/utils/promiseUtils";

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

  async effect(
    {
      panelHeading,
      forcePanel = false,
    }: BrickArgs<{
      panelHeading?: string;
      forcePanel?: boolean;
    }>,
    { logger }: BrickOptions,
  ): Promise<void> {
    // Don't pass extensionId here because the extensionId in showOptions refers to the extensionId of the panel,
    // not the extensionId of the extension toggling the sidebar
    void logPromiseDuration(
      "ShowSidebar:showSidebar",
      showSidebar({
        force: forcePanel,
        panelHeading,
        blueprintId: logger.context.blueprintId,
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

  async effect(): Promise<void> {
    hideSidebar();
  }
}
