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
import { ModifiesModFormState } from "./utils";

export type StarterBrickUIName =
  | "Context Menu"
  | "Trigger"
  | "Button"
  | "Quick Bar Action"
  | "Dynamic Quick Bar"
  | "Sidebar Panel";

type NotButtonStarterBrickUIName =
  | "Context Menu"
  | "Trigger"
  | "Quick Bar Action"
  | "Dynamic Quick Bar"
  | "Sidebar Panel";

const domainRegExp =
  /(?:[\da-z](?:[\da-z-]{0,61}[\da-z])?\.)+[\da-z][\da-z-]{0,61}[\da-z]/i;

const starterBrickUINameToComponentDefaultName: Record<
  StarterBrickUIName,
  RegExp
> = {
  "Context Menu": /Context menu item/,
  // eslint-disable-next-line security/detect-non-literal-regexp -- Inserting from another static RegExp
  Trigger: new RegExp(`My ${domainRegExp.source} trigger`),
  // eslint-disable-next-line security/detect-non-literal-regexp -- Inserting from another static RegExp
  Button: new RegExp(`My ${domainRegExp.source} button`),
  "Quick Bar Action": /Quick Bar item/,
  "Dynamic Quick Bar": /Dynamic Quick Bar/,
  "Sidebar Panel": /Sidebar Panel/,
};

export class ModActionMenu extends BasePageObject {
  get copyButton() {
    return this.getByRole("menuitem", { name: "Make a copy" });
  }

  get deactivateButton() {
    return this.getByRole("menuitem", { name: "Deactivate" });
  }

  @ModifiesModFormState
  async addStarterBrick(starterBrickName: StarterBrickUIName) {
    await this.getByRole("menuitem", { name: "Add starter brick" }).hover();
    await this.getByRole("menuitem", { name: starterBrickName }).click();
  }
}

type AddNewModInputs =
  | {
      starterBrickName: NotButtonStarterBrickUIName;
      insertButtonCallback?: never;
    }
  | {
      starterBrickName: "Button";
      insertButtonCallback: () => Promise<void>;
    };

export class ModListItem extends BasePageObject {
  get saveButton() {
    return this.locator("[data-icon=save]");
  }

  get menuButton() {
    return this.getByLabel(" - Ellipsis");
  }

  get unavailableIcon() {
    return this.getByRole("img", {
      name: "Not available on page",
    });
  }

  async select() {
    return this.click();
  }

  get modActionMenu() {
    return new ModActionMenu(this.page.getByLabel("Menu"));
  }
}

export class ModListingPanel extends BasePageObject {
  newModButton = this.getByRole("button", { name: "New Mod", exact: true });
  quickFilterInput = this.getByPlaceholder("Quick filter");
  get activeModListItem() {
    return new ModListItem(this.locator(".list-group-item.active"));
  }

  /**
   * Adds a new mod in the page editor, with one component with the given starter brick type.
   *
   * @param inputs the starter brick name to add, corresponding to the name shown in the Page Editor UI,
   * not the underlying type, and optionally a callback to insert the button if using button starter
   * brick type.
   * @returns modComponentName the generated mod component name
   */
  @ModifiesModFormState
  async addNewMod({
    starterBrickName,
    insertButtonCallback,
  }: AddNewModInputs): Promise<{
    modComponentNameMatcher: RegExp;
  }> {
    await this.newModButton.click();
    await this.locator("[role=button].dropdown-item", {
      hasText: starterBrickName,
    }).click();

    if (insertButtonCallback) {
      await insertButtonCallback();
    }

    return {
      modComponentNameMatcher:
        starterBrickUINameToComponentDefaultName[starterBrickName],
    };
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
