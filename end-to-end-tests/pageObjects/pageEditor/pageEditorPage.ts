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
import { ModListingPanel, type StarterBrickUIName } from "./modListingPanel";
import { BrickActionsPanel } from "./brickActionsPanel";
import { ConfigurationForm } from "./configurationForm";
import { DataPanel } from "./dataPanel";
import { ModEditorPane } from "./modEditorPane";
import { ModifiesModFormState } from "./utils";
import { CreateModModal } from "./createModModal";
import { DeactivateModModal } from "end-to-end-tests/pageObjects/pageEditor/deactivateModModal";
import { uuidv4 } from "@/types/helpers";

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

  readonly savedPackageModIds: string[] = [];

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
    const { saveButton } = this.modListingPanel.activeModListItem;
    // If you encounter this timeout, make sure you are selecting a Mod list
    // item in the mod listing panel (not a mod component) before calling this function
    await saveButton.waitFor({ state: "visible", timeout: 1000 });
    // eslint-disable-next-line playwright/no-wait-for-timeout -- The save button re-renders several times so we need a slight delay here before playwright clicks
    await this.page.waitForTimeout(300);
    await saveButton.click();
    await this.page
      .getByRole("status")
      .filter({ hasText: "Saved mod" })
      .waitFor({ state: "visible", timeout: 5000 });
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
  async copyMod(modName: string, modUuid: UUID) {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();

    await modListItem.menuButton.click();
    const actionMenu = modListItem.modActionMenu;
    await actionMenu.copyButton.click();

    const createModModal = new CreateModModal(this.getByRole("dialog"));
    const modId = await createModModal.copyMod(modName, modUuid);

    this.savedPackageModIds.push(modId);
  }

  async deactivateMod(modName: string) {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();

    await modListItem.menuButton.click();
    const actionMenu = modListItem.modActionMenu;
    await actionMenu.deactivateButton.click();

    const deactivateModModal = new DeactivateModModal(this.getByRole("dialog"));
    await deactivateModModal.deactivateButton.click();
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

  @ModifiesModFormState
  async addNewModWithButtonStarterBrick(
    selectButtonCallback: () => Promise<void>,
  ): Promise<{
    modName: string;
    modComponentName: string;
  }> {
    const modUuid = uuidv4();
    const initialModName = "My pbx.vercel.app button";
    const modName = "Test Mod created with Button";
    const modComponentName = `Test Button ${modUuid}`;

    await this.modListingPanel.newModButton.click();
    await this.modListingPanel
      .locator("[role=button].dropdown-item", {
        hasText: "Button",
      })
      .click();

    // Call the callback to select the button in the page
    await selectButtonCallback();

    // Wait for the mod to be created and its name to be visible
    // Allow for two instances of the text (mod name and component name)
    const buttonText = this.page.getByText(initialModName);
    await expect(buttonText).toHaveCount(2);
    await expect(buttonText.first()).toBeVisible();
    await expect(buttonText.nth(1)).toBeVisible();

    // Update the component name first
    await this.brickConfigurationPanel.fillField("Name", modComponentName);

    // Select the mod list item by the initial name
    const modListItem =
      this.modListingPanel.getModListItemByName(initialModName);
    await modListItem.select();

    // Update the mod name
    await this.modEditorPane.editMetadataTabPanel.name.fill(modName);

    // Expect both the mod name and component name to be visible
    await expect(this.page.getByText(modName)).toBeVisible();
    await expect(this.page.getByText(modComponentName)).toBeVisible();

    // Select the component list item again
    const componentListItem = this.modListingPanel.getModStarterBrick(
      modName,
      "Button",
    );
    await componentListItem.select();

    return { modName, modComponentName };
  }

  @ModifiesModFormState
  async addNewModWithNonButtonStarterBrick(
    starterBrickName: Exclude<StarterBrickUIName, "Button">,
  ): Promise<{
    modName: string;
    modComponentName: string;
  }> {
    const modUuid = uuidv4();
    let initialModName: RegExp;
    switch (starterBrickName) {
      case "Context Menu": {
        initialModName = /Context menu item/;
        break;
      }

      case "Trigger": {
        initialModName = /My .* trigger/;
        break;
      }

      case "Quick Bar Action": {
        initialModName = /Quick Bar item/;
        break;
      }

      case "Dynamic Quick Bar": {
        initialModName = /Dynamic Quick Bar item/;
        break;
      }

      case "Sidebar Panel": {
        initialModName = /Sidebar Panel item/;
        break;
      }

      default: {
        // eslint-disable-next-line security/detect-non-literal-regexp -- Constructed from constant strings, not user input
        initialModName = new RegExp(`My .* ${starterBrickName}`);
        break;
      }
    }

    const modName = `Test Mod created with ${starterBrickName}`;
    const modComponentName = `Test ${starterBrickName} ${modUuid}`;

    await this.modListingPanel.newModButton.click();
    await this.modListingPanel
      .locator("[role=button].dropdown-item", {
        hasText: starterBrickName,
      })
      .click();

    // Wait for the mod to be created and its name to be visible
    const initialModNameText = this.page.getByText(initialModName);
    // At least two instances for the component and the mod, but there
    // may be many more instances of the text on screen for generic names
    // like "Sidebar Panel"
    await expect(initialModNameText.first()).toBeVisible();
    await expect(initialModNameText.nth(1)).toBeVisible();

    // Update the component name first
    await this.brickConfigurationPanel.fillField("Name", modComponentName);

    // Select the mod list item by the initial name
    const modListItem =
      this.modListingPanel.getModListItemByName(initialModName);
    await modListItem.select();

    // Update the mod name
    await this.modEditorPane.editMetadataTabPanel.name.fill(modName);

    // Expect both the mod name and component name to be visible
    await expect(this.page.getByText(modName)).toBeVisible();
    await expect(this.page.getByText(modComponentName)).toBeVisible();

    // Select the component list item again
    const componentListItem = this.modListingPanel.getModStarterBrick(
      modName,
      starterBrickName,
    );
    await componentListItem.select();

    return { modName, modComponentName };
  }

  @ModifiesModFormState
  async saveNewMod(modName: string, description?: string): Promise<string> {
    const modListItem = this.modListingPanel.getModListItemByName(modName);
    await modListItem.select();
    await expect(
      this.modEditorPane.editMetadataTabPanel.getByText(
        "Save the mod to assign an id",
      ),
    ).toBeVisible();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- The save button re-renders several times so we need a slight delay here before playwright clicks
    await this.page.waitForTimeout(600);
    await modListItem.saveButton.click();

    // Handle the "Save new mod" modal
    const saveNewModModal = this.page.getByRole("dialog");
    await expect(saveNewModModal).toBeVisible();
    await expect(saveNewModModal.getByText("Save new mod")).toBeVisible();

    if (description) {
      // Update the mod description
      const descriptionInput = saveNewModModal.locator(
        'input[name="description"]',
      );
      await descriptionInput.fill(description);
    }

    // Click the Save button in the modal
    await saveNewModModal.getByRole("button", { name: "Save" }).click();

    // Wait for the save confirmation
    await expect(
      this.page
        .getByRole("status")
        .filter({ hasText: "Mod created successfully" }),
    ).toBeVisible();

    // Mark the modId for cleanup after the test
    const modId =
      await this.modEditorPane.editMetadataTabPanel.modId.inputValue();
    this.savedPackageModIds.push(modId);

    return modId;
  }
}
