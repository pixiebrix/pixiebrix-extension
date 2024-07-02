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
import { Locator } from "@playwright/test";

// Starter brick names as shown in the Page Editor UI
export type StarterBrickName =
  | "Context Menu"
  | "Trigger"
  | "Button"
  | "Quick Bar Action"
  | "Dynamic Quick Bar"
  | "Sidebar Panel";

export class ModListItem extends BasePageObject {
  saveButton = this.locator("[data-icon=save]");
  get menuButton() {
    return this.getByLabel(`${this.modComponentName} - Ellipsis`);
  }

  constructor(
    root: Locator,
    readonly modComponentName: string,
  ) {
    super(root);
  }

  async activate() {
    return this.root.click();
  }
}

export class ModListingPanel extends BasePageObject {
  addButton = this.getByRole("button", { name: "Add", exact: true });

  /**
   * Adds a starter brick in the Page Editor. Generates a unique mod name to prevent
   * test collision.
   *
   * @param starterBrickName the starter brick name to add, corresponding to the name shown in the Page Editor UI,
   * not the underlying type
   * @returns modName the generated mod name
   */
  async addStarterBrick(starterBrickName: StarterBrickName) {
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
      this.locator(".list-group-item")
        .locator("span", { hasText: modName })
        .first(),
      modName,
    );
  }
}
