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

export class FloatingActionButton {
  constructor(private readonly page: Page) {}

  async getActionButton() {
    return this.page.getByRole("button", {
      name: "Toggle the PixieBrix Sidebar",
    });
  }

  async toggleSidebar() {
    const floatingActionButton = await this.getActionButton();
    await floatingActionButton.click();
  }

  async hideFloatingActionButton() {
    const actionButton = await this.getActionButton();
    await actionButton.hover();

    const hideButton = this.page.getByRole("button", {
      name: "Hide Button",
    });
    await hideButton.click();
  }
}
