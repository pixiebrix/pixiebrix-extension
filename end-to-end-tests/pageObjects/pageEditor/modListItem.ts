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
import { ModActionMenu, ModComponentActionMenu } from "./modActionMenu";

class BaseListItem extends BasePageObject {
  get dirtyIcon() {
    return this.locator("span[title='Unsaved changes']");
  }

  get menuButton() {
    return this.getByLabel(" - Ellipsis");
  }

  async select() {
    return this.click({ timeout: 5000 });
  }
}

export class ModListItem extends BaseListItem {
  get saveButton() {
    return this.locator("[data-icon=save]");
  }

  get modActionMenu() {
    return new ModActionMenu(
      this.locator("[data-testid='ellipsis-menu-button']"),
    );
  }
}

export class ModComponentListItem extends BaseListItem {
  get unavailableIcon() {
    return this.getByRole("img", {
      name: "Not available on page",
    });
  }

  get modComponentActionMenu() {
    return new ModComponentActionMenu(
      this.locator("[data-testid='ellipsis-menu-button']"),
    );
  }
}
