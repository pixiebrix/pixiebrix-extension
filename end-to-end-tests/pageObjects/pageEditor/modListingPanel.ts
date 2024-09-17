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

import { BasePageObject } from "../basePageObject";
import { ModComponentListItem, ModListItem } from "./modListItem";

export class ModListingPanel extends BasePageObject {
  newModButton = this.getByRole("button", { name: "New Mod", exact: true });
  quickFilterInput = this.getByPlaceholder("Quick filter");

  getModListItemByName(modName: string | RegExp): ModListItem {
    return new ModListItem(
      this.locator(".list-group-item", { hasText: modName }).first(),
    );
  }

  getModStarterBrick(modName: string, starterBrickName: string) {
    const modStarterBricks = this.locator(
      `.collapse:below(:text("${modName}"))`,
    );
    return new ModComponentListItem(
      modStarterBricks
        .locator(".list-group-item", {
          hasText: starterBrickName,
        })
        .first(),
    );
  }

  getAllModStarterBricks(modName: string) {
    const modStarterBricks = this.locator(
      `.collapse:below(:text("${modName}"))`,
    );
    return modStarterBricks.locator(".list-group-item");
  }
}
