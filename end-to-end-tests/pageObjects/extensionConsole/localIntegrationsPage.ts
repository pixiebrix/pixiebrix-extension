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
import { BasePageObject } from "../basePageObject";

export class LocalIntegrationsPage extends BasePageObject {
  private readonly extensionConsoleUrl?: string;

  constructor(page: Page, extensionId?: string) {
    super(page);
    this.extensionConsoleUrl =
      extensionId && getBaseExtensionConsoleUrl(extensionId);
  }

  async goto() {
    if (this.extensionConsoleUrl) {
      await this.page.goto(this.extensionConsoleUrl);
    }

    await this.getByRole("link", {
      name: "Local Integrations",
    }).click();

    await expect(
      this.getByRole("heading", { name: "Local Integrations" }),
    ).toBeVisible();

    await expect(this.getByTestId("loader")).toBeHidden();
  }

  async createNewIntegration(integrationName: string) {
    await this.getByRole("button", { name: "Add Local Integration" }).click();

    await this.getByPlaceholder("Start typing to find results").fill(
      integrationName,
    );

    await this.getByText(integrationName).first().click();

    await this.getByTestId(`${integrationName} detail button`).click();
  }
}
