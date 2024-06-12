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

import { type Page } from "@playwright/test";
import { WorkshopModEditor } from "./modEditor";

export class EditWorkshopModPage {
  readonly editor: WorkshopModEditor;
  constructor(private readonly page: Page) {
    this.editor = new WorkshopModEditor(this.page);
  }

  async updateBrick() {
    await this.page.getByRole("button", { name: "Update Brick" }).click();
  }

  async deleteBrick() {
    await this.page.getByRole("button", { name: "Delete Brick" }).click();
    await this.page.getByRole("button", { name: "Permanently Delete" }).click();
    // eslint-disable-next-line playwright/no-networkidle -- for some reason, can't assert on the "Brick deleted" notice
    await this.page.waitForLoadState("networkidle");
  }
}
