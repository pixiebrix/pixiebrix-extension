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

import { type Locator, type Page } from "playwright";

/**
 * BasePageObject is the base class for all page objects.
 * It acts as a way to scope locators to a specific root locator and provides
 * shortcuts to common locator functions.
 *
 * @example
 * class LoginPage extends BasePageObject {
 *   // define common locators at the top.
 *   usernameInput = this.getByPlaceholder('Username');
 *   passwordInput = this.getByPlaceholder('Password');
 *
 *   async login(username, password) {
 *     await usernameInput.fill(username);
 *     await passwordInput.fill(password);
 *     await this.getByRole('button', { name: /log in/i }).click();
 *   }
 * }
 *
 * // in the test
 * const loginPage = new LoginPage(page);
 * await loginPage.login('testUser', 'testPassword');
 *
 * @example
 * // Nested Page Objects
 * class UserProfile extends BasePageObject {
 *   async getUsername() {
 *     return await this.getByTestId('username').innerText();
 *   }
 * }
 *
 * class DashboardPage extends BasePageObject {
 *   const userProfile = new UserProfile(this.getByTestId('user-profile'));
 *   // other methods
 * }
 *
 * // in the test
 * const dashboardPage = new DashboardPage(page);
 * const username = await dashboardPage.userProfile.getUsername();
 *
 * @param {Locator|Page} rootLocatorOrPage The root locator scoping this page object.
 * If a Page is provided, the root locator will be the body.
 */
export class BasePageObject {
  readonly root: Locator;
  readonly page: Page;

  readonly locator: Locator["locator"];
  readonly getByAltText: Locator["getByAltText"];
  readonly getByLabel: Locator["getByLabel"];
  readonly getByPlaceholder: Locator["getByPlaceholder"];
  readonly getByRole: Locator["getByRole"];
  readonly getByTestId: Locator["getByTestId"];
  readonly getByText: Locator["getByText"];
  readonly getByTitle: Locator["getByTitle"];

  constructor(rootLocatorOrPage: Locator | Page) {
    if ("page" in rootLocatorOrPage) {
      this.root = rootLocatorOrPage;
      this.page = rootLocatorOrPage.page();
    } else {
      this.root = rootLocatorOrPage.locator("html");
      this.page = rootLocatorOrPage;
    }

    this.locator = this.root.locator.bind(this.root);
    this.getByAltText = this.root.getByAltText.bind(this.root);
    this.getByLabel = this.root.getByLabel.bind(this.root);
    this.getByPlaceholder = this.root.getByPlaceholder.bind(this.root);
    this.getByRole = this.root.getByRole.bind(this.root);
    this.getByTestId = this.root.getByTestId.bind(this.root);
    this.getByText = this.root.getByText.bind(this.root);
    this.getByTitle = this.root.getByTitle.bind(this.root);
  }
}
