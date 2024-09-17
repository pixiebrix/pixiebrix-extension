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
import type { StarterBrickUIName } from "./types";

class BaseActionMenu extends BasePageObject {
  get clearOption() {
    return this.getByRole("menuitem", { name: "Clear Changes" });
  }
}

export class ModActionMenu extends BaseActionMenu {
  @ModifiesModFormState
  async addStarterBrick(starterBrickName: StarterBrickUIName) {
    await this.getByRole("menuitem", { name: /Add Starter Brick$/ }).hover();
    await this.getByRole("menuitem", { name: starterBrickName }).click();
  }

  get copyOption() {
    return this.getByRole("menuitem", { name: "Make a copy" });
  }

  get deactivateOption() {
    return this.getByRole("menuitem", { name: "Deactivate" });
  }

  get deleteNewModOption() {
    return this.getByRole("menuitem", { name: "Delete new Mod" });
  }
}

export class ModComponentActionMenu extends BaseActionMenu {
  get duplicateOption() {
    return this.getByRole("menuitem", { name: "Duplicate" });
  }

  get moveFromModOption() {
    return this.getByRole("menuitem", { name: "Move from Mod" });
  }

  get copyToModOption() {
    return this.getByRole("menuitem", { name: "Copy to Mod" });
  }

  get deleteOption() {
    return this.getByRole("menuitem", { name: "Delete component" });
  }
}
