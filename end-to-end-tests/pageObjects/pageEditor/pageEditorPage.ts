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

import { getBasePageEditorUrl } from "../constants";
import { type Page, expect } from "@playwright/test";
import { ModsPage } from "../extensionConsole/modsPage";
import { WorkshopPage } from "../extensionConsole/workshop/workshopPage";
import { type UUID } from "@/types/stringTypes";
import { BasePageObject } from "../basePageObject";
import { ModListingPanel } from "./modListingPanel";

/**
 * Page object for the Page Editor. Prefer the newPageEditorPage fixture in testBase.ts to directly creating an
 * instance of this class to take advantage of automatic cleanup of saved mods.
 *
 * @knip usage of PageEditorPage indirectly via the newPageEditorPage fixture in testBase.ts causes a
 * false-positive
 */
export class PageEditorPage extends BasePageObject {
  private readonly pageEditorUrl: string;
  private readonly savedStandaloneModNames: string[] = [];
  private readonly savedPackageModIds: string[] = [];

  modListingPanel = new ModListingPanel(this.getByTestId("modListingPanel"));

  templateGalleryButton = this.getByRole("button", {
    name: "Launch Template Gallery",
  });

  constructor(
    page: Page,
    private readonly urlToConnectTo: string,
    private readonly extensionId: string,
  ) {
    super(page);
    this.pageEditorUrl = getBasePageEditorUrl(extensionId);
  }

  async goto() {
    await this.page.goto(this.pageEditorUrl);
    // Set the viewport size to the expected in horizontal layout size of the devconsole when docked on the bottom.
    await this.page.setViewportSize({ width: 1280, height: 300 });
    await this.getByTestId(`tab-${this.urlToConnectTo}`).click();
    const heading = this.getByRole("heading", {
      name: "Welcome to the Page Editor!",
    });
    await expect(heading).toBeVisible();
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  async waitForReduxUpdate() {
    // See EditorPane.tsx:REDUX_SYNC_WAIT_MILLIS
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Wait for Redux to update
    await this.page.waitForTimeout(500);
  }

  async setStarterBrickName(modComponentName: string) {
    await this.fillInBrickField("Name", modComponentName);
    await this.waitForReduxUpdate();
  }

  async fillInBrickField(fieldLabel: string, value: string) {
    await this.getByLabel(fieldLabel).fill(value);
    await this.waitForReduxUpdate();
  }

  async addBrickToModComponent(
    brickName: string,
    { index = 0 }: { index?: number } = {},
  ) {
    await this.getByTestId(/icon-button-.*-add-brick/)
      .nth(index)
      .click();

    await this.getByTestId("tag-search-input").fill(brickName);
    await this.getByRole("button", { name: brickName }).click();

    await this.getByRole("button", { name: "Add brick" }).click();
  }

  async selectConnectedPageElement(connectedPage: Page) {
    // Without focusing first, the click doesn't enable selection tool ¯\_(ツ)_/¯
    await this.getByLabel("Select element").focus();
    await this.getByLabel("Select element").click();

    await connectedPage.bringToFront();
    await expect(
      connectedPage.getByText("Selection Tool: 0 matching"),
    ).toBeVisible();
    await connectedPage
      .getByRole("heading", { name: "Transaction Table" })
      .click();

    await this.page.bringToFront();
    await expect(this.getByPlaceholder("Select an element")).toHaveValue(
      "#root h1",
    );

    await this.waitForReduxUpdate();
  }

  /**
   * Save a selected packaged mod. Prefer saveStandaloneMod for standalone mods.
   */
  async saveSelectedPackagedMod() {
    // TODO: this method is currently meant for packaged mods that aren't meant to be
    //  cleaned up after the test. Future work is adding affordance to clean up saved packaged
    //  mods, with an option to avoid cleanup for certain mods.
    await this.locator("[data-icon=save]").click();
    await this.getByRole("button", { name: "Save" }).click();
  }

  getRenderPanelButton() {
    return this.getByRole("button", { name: "Render Panel" });
  }

  getIncrementVersionErrorToast() {
    return this.getByText(
      "Cannot overwrite version of a published brick. Increment the version",
    );
  }

  async saveStandaloneMod(modName: string) {
    // Wait for redux to persist the page editor mod changes before saving.
    await this.waitForReduxUpdate();
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.activate();
    await modListItem.saveButton.click();
    await expect(this.getByText("Saved Mod")).toBeVisible();
    this.savedStandaloneModNames.push(modName);
  }

  async createModFromModComponent({
    modNameRoot,
    modComponentName,
    modUuid,
  }: {
    modNameRoot: string;
    modComponentName: string;
    modUuid: UUID;
  }) {
    const modName = `${modNameRoot} ${modUuid}`;

    const modListItem =
      this.modListingPanel.getModListItemByName(modComponentName);
    await modListItem.menuButton.click();
    await this.getByRole("button", { name: "Add to mod" }).click();

    await this.getByText("Select...Choose a mod").click();
    await this.getByRole("option", { name: /Create new mod.../ }).click();
    await this.getByRole("button", { name: "Move" }).click();

    const modId = `${modName.split(" ").join("-").toLowerCase()}-${modUuid}`;
    await this.getByTestId("registryId-id-id").fill(modId);

    await this.getByLabel("Name", { exact: true }).fill(modName);
    await this.getByRole("button", { name: "Create" }).click();

    this.savedPackageModIds.push(modId);

    return { modName, modId };
  }

  /**
   * This method is meant to be called exactly once after the test is done to clean up any saved mods created during the
   * test.
   *
   * @see newPageEditorPage in fixtures/testBase.ts
   */
  async cleanup() {
    const modsPage = new ModsPage(this.page, this.extensionId);
    await modsPage.goto();
    for (const standaloneModName of this.savedStandaloneModNames) {
      await modsPage.deleteModByName(standaloneModName);
    }

    const workshopPage = new WorkshopPage(this.page, this.extensionId);
    await workshopPage.goto();
    for (const packagedModId of this.savedPackageModIds) {
      await workshopPage.deletePackagedModByModId(packagedModId);
    }
  }
}
