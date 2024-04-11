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

import { expect, type Page } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../constants";

export class LocalIntegrationsPage {
  private readonly extensionConsoleUrl: string;

  constructor(
    private readonly page: Page,
    extensionId: string,
  ) {
    this.extensionConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
  }

  async goto() {
    await this.page.goto(this.extensionConsoleUrl);
    await this.page
      .getByRole("link", {
        name: "Local Integrations",
      })
      .click();

    await expect(
      this.page.getByRole("heading", { name: "Local Integrations" }),
    ).toBeVisible();

    await expect(this.page.getByTestId("loader")).not.toBeVisible();
  }

  async createNewIntegration(integrationName: string) {
    await this.page
      .getByRole("button", { name: "Add Local Integration" })
      .click();

    await this.page
      .getByPlaceholder("Start typing to find results")
      .fill(integrationName);

    await this.page.getByText(integrationName).first().hover();

    await this.page.getByTestId(`${integrationName} button`).click();
  }
}
