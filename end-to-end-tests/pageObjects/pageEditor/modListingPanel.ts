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
import { uuidv4 } from "@/types/helpers";
import { ModifiesModState } from "./utils";

export type StarterBrickUIName =
  | "Context Menu"
  | "Trigger"
  | "Button"
  | "Quick Bar Action"
  | "Dynamic Quick Bar"
  | "Sidebar Panel";

export class ModListItem extends BasePageObject {
  saveButton = this.locator("[data-icon=save]");
  get menuButton() {
    return this.getByLabel(" - Ellipsis");
  }

  get unavailableIcon() {
    return this.getByRole("img", {
      name: "Not available on page",
    });
  }

  get copyButton() {
    return this.getByRole("menuitem", { name: "Make a copy" });
  }

  get deactivateButton() {
    return this.getByRole("menuitem", { name: "Deactivate" });
  }

  async select() {
    return this.click();
  }
}

export class ModListingPanel extends BasePageObject {
  addButton = this.getByRole("button", { name: "Add", exact: true });
  quickFilterInput = this.getByPlaceholder("Quick filter");
  get activeModListItem() {
    return new ModListItem(this.locator(".list-group-item.active"));
  }

  /**
   * Adds a starter brick in the Page Editor. Generates a unique mod name to prevent
   * test collision.
   *
   * @param starterBrickName the starter brick name to add, corresponding to the name shown in the Page Editor UI,
   * not the underlying type
   * @returns modName the generated mod name
   */
  @ModifiesModState
  async addStarterBrick(starterBrickName: StarterBrickUIName) {
    const modUuid = uuidv4();
    const modComponentName = `Test ${starterBrickName} ${modUuid}`;
    await this.addButton.click();
    await this.locator("[role=button].dropdown-item", {
      hasText: starterBrickName,
    }).click();

    return { modComponentName, modUuid };
  }

  getModListItemByName(modName: string) {
    return new ModListItem(
      this.locator(".list-group-item", { hasText: modName }).first(),
    );
  }

  getModStarterBrick(modName: string, starterBrickName: string) {
    const modStarterBricks = this.locator(
      `.collapse:below(:text("${modName}"))`,
    );
    return new ModListItem(
      modStarterBricks
        .locator(".list-group-item", {
          hasText: starterBrickName,
        })
        .first(),
    );
  }
}
