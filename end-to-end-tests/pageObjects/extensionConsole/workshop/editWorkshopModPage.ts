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

import { WorkshopModEditor } from "./modEditor";
import { BasePageObject } from "end-to-end-tests/pageObjects/basePageObject";

export class EditWorkshopModPage extends BasePageObject {
  editor = new WorkshopModEditor(this.getByLabel("Editor"));

  async updateBrick() {
    await this.getByRole("button", { name: "Update Brick" }).click();
  }

  async deleteBrick() {
    await this.getByRole("button", { name: "Delete Brick" }).click();
    await this.getByRole("button", { name: "Permanently Delete" }).click();
    // eslint-disable-next-line playwright/no-networkidle -- for some reason, can't assert on the "Brick deleted" notice
    await this.page.waitForLoadState("networkidle");
  }
}
