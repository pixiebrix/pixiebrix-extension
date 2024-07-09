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
import { ModifiesModState } from "./utils";

export class Brick extends BasePageObject {
  moveUp() {
    return this.getByTestId("brick-name");
  }

  async select() {
    return this.click();
  }
}

export class BrickActionsPanel extends BasePageObject {
  getAddBrickButton(n: number) {
    return this.getByTestId(/icon-button-.*-add-brick/).nth(n);
  }

  getBrickByName(brickName: string) {
    return new Brick(
      this.getByTestId("editor-node-layout").filter({
        hasText: brickName,
      }),
    );
  }

  getActiveBrick() {
    return new Brick(
      this.getByTestId("editor-node-layout").filter({
        has: this.locator(".active"),
      }),
    );
  }

  @ModifiesModState
  async addBrick(brickName: string, { index = 0 }: { index?: number } = {}) {
    await this.getAddBrickButton(index).click();

    // Add brick modal
    await this.page.getByTestId("tag-search-input").fill(brickName);
    await this.page.getByRole("button", { name: brickName }).first().click();

    await this.page.getByRole("button", { name: "Add brick" }).click();
  }
}
