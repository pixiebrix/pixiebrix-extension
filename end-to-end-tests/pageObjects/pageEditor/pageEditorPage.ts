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
import { type Page, expect, type Locator } from "@playwright/test";
import { ModsPage } from "../extensionConsole/modsPage";
import { WorkshopPage } from "../extensionConsole/workshop/workshopPage";
import { type UUID } from "@/types/stringTypes";
import { BasePageObject } from "../basePageObject";
import { ModListingPanel } from "./modListingPanel";
import { BrickActionsPanel } from "./brickActionsPanel";
import { ConfigurationForm } from "./configurationForm";
import { DataPanel } from "./dataPanel";
import { ModEditorPane } from "./modEditorPane";
import { ModifiesModFormState } from "./utils";
import { CreateModModal } from "./createModModal";
import { DeactivateModModal } from "end-to-end-tests/pageObjects/pageEditor/deactivateModModal";

class EditorPane extends BasePageObject {
  editTab = this.getByRole("tab", { name: "Edit" });
  logsTab = this.getByRole("tab", { name: "Logs" });

  runTriggerButton = this.getByRole("button", { name: "Run Trigger" });
  autoRunTrigger = this.getSwitchByLabel("Auto-Run");

  renderPanelButton = this.getByRole("button", {
    name: "Render Panel",
  });

  autoRenderPanel = this.getSwitchByLabel("Auto-Render");

  brickActionsPanel = new BrickActionsPanel(
    this.getByTestId("brickActionsPanel"),
  );

  brickConfigurationPanel = new ConfigurationForm(
    this.getByTestId("brickConfigurationPanel"),
  );

  dataPanel = new DataPanel(this.getByTestId("dataPanel"));
}
/**
 * Page object for the Page Editor. Prefer the newPageEditorPage fixture in testBase.ts to directly creating an
 * instance of this class to take advantage of automatic cleanup of saved mods.
 */
export class PageEditorPage extends BasePageObject {
  private readonly pageEditorUrl: string;
  private readonly savedPackageModIds: string[] = [];

  modListingPanel = new ModListingPanel(this.getByTestId("modListingPanel"));

  modEditorPane = new ModEditorPane(this.getByTestId("modEditorPane"));

  editorPane = new EditorPane(this.getByTestId("editorPane"));
  brickActionsPanel = this.editorPane.brickActionsPanel;
  brickConfigurationPanel = this.editorPane.brickConfigurationPanel;
  dataPanel = this.editorPane.dataPanel;

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
    await this.page.setViewportSize({ width: 1280, height: 600 });
    await this.getByTestId(`tab-${this.urlToConnectTo}`).click();
    const heading = this.getByRole("heading", {
      name: "Welcome to the Page Editor!",
    });
    await expect(heading).toBeVisible();
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  /** Used for interactions that require selecting an element on the connected page, such as the button starter brick */
  @ModifiesModFormState
  async selectConnectedPageElement(selectLocator: Locator) {
    const connectedPage = selectLocator.page();
    await connectedPage.bringToFront();
    await expect(
      connectedPage.getByText("Selection Tool: 0 matching"),
    ).toBeVisible();
    await selectLocator.click();

    await this.page.bringToFront();
  }

  /**
   * Save the current active mod. Prefer saveStandaloneMod for standalone mods.
   */
  async saveActiveMod() {
    // TODO: this method is currently meant for mods that aren't meant to be
    //  cleaned up after the test. Future work is adding affordance to clean up saved packaged
    //  mods, with an option to avoid cleanup for certain mods.
    await this.modListingPanel.activeModListItem.saveButton.click();
    await expect(
      this.page.getByRole("status").filter({ hasText: "Saved mod" }),
    ).toBeVisible();
  }

  getRenderPanelButton() {
    return this.getByRole("button", { name: "Render Panel" });
  }

  getIncrementVersionErrorToast() {
    return this.getByText(
      "Cannot overwrite version of a published brick. Increment the version",
    );
  }

  @ModifiesModFormState
  async saveStandaloneMod(modName: string, modUuid: UUID) {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();
    await modListItem.saveButton.click();

    const createModModal = new CreateModModal(this.getByRole("dialog"));
    const modId = await createModModal.createMod(modName, modUuid);

    this.savedPackageModIds.push(modId);
  }

  @ModifiesModFormState
  async copyMod(modName: string, modUuid: UUID) {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();

    await modListItem.menuButton.click();
    await modListItem.copyButton.click();

    const createModModal = new CreateModModal(this.getByRole("dialog"));
    const modId = await createModModal.copyMod(modName, modUuid);

    this.savedPackageModIds.push(modId);
  }

  async deactivateMod(modName: string) {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();

    await modListItem.menuButton.click();
    await modListItem.deactivateButton.click();

    const deactivateModModal = new DeactivateModModal(this.getByRole("dialog"));
    await deactivateModModal.deactivateButton.click();
  }

  @ModifiesModFormState
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
    await this.getByRole("menuitem", { name: "Add to mod" }).click();

    await this.getByText("Select...Choose a mod").click();
    await this.getByRole("option", { name: /Create new mod.../ }).click();
    await this.getByRole("button", { name: "Move" }).click();

    // Create mod modal is shown
    const createModModal = new CreateModModal(this.getByRole("dialog"));
    const modId = await createModModal.createMod(modName, modUuid);

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

    const workshopPage = new WorkshopPage(this.page, this.extensionId);
    await workshopPage.goto();
    for (const packagedModId of this.savedPackageModIds) {
      await workshopPage.deletePackagedModByModId(packagedModId);
    }
  }
}
