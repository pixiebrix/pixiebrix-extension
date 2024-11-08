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
import {
  getModifierKey,
  getModifierSymbol,
  isChrome,
  isChromium,
  isMsEdge,
} from "../utils";
import { BasePageObject } from "./basePageObject";
import { type SupportedChannel } from "../../playwright.config";

function getExtensionShortcutsUrl(chromiumChannel: SupportedChannel) {
  if (isChrome(chromiumChannel) || isChromium(chromiumChannel)) {
    return "chrome://extensions/shortcuts";
  }

  if (isMsEdge(chromiumChannel)) {
    return "edge://extensions/shortcuts";
  }

  throw new Error(`Unexpected channel: ${chromiumChannel}`);
}

async function getShortcut(page: Page): Promise<string> {
  const modifierKey = await getModifierKey(page);
  const modifierSymbol = await getModifierSymbol(page);

  return modifierKey === "Meta" ? `${modifierSymbol}M` : "Ctrl + M";
}

export class ExtensionsShortcutsPage extends BasePageObject {
  readonly pageUrl: string;

  editToggleQuickBarShortcut = this.getByLabel("Edit shortcut Toggle Quick").or(
    // Old versions of Edge show a clear button rather than "edit"
    this.getByRole("button", { name: "Clear shortcut" }),
  );

  toggleQuickBarShortcutTextBox = this.getByRole("textbox", {
    name: "Shortcut Toggle Quick Bar for PixieBrix",
  }).or(
    // Old versions of Edge have a different label
    this.getByLabel(/Type a shortcut that will Toggle Quick Bar for PixieBrix/),
  );

  constructor(
    page: Page,
    readonly chromiumChannel: SupportedChannel,
  ) {
    super(page);
    this.pageUrl = getExtensionShortcutsUrl(this.chromiumChannel);
  }

  async goto() {
    await this.page.goto(this.pageUrl);

    if (isChrome(this.chromiumChannel)) {
      await expect(
        this.getByRole("heading", { name: /PixieBrix/ }),
      ).toBeVisible();
    } else {
      await expect(this.getByText(/PixieBrix/)).toBeVisible();
    }
  }

  async clearQuickbarShortcut() {
    await this.page.bringToFront();

    const shortcut = await getShortcut(this.page);
    // Verify the shortcut is initially set
    await expect(this.toggleQuickBarShortcutTextBox).toHaveValue(shortcut);

    // Clear the shortcut
    await this.editToggleQuickBarShortcut.click();

    await expect(this.toggleQuickBarShortcutTextBox).toBeEmpty();
  }

  async setQuickbarShortcut() {
    await this.page.bringToFront();

    const modifierKey = await getModifierKey(this.page);
    // Verify the shortcut is initially cleared
    await expect(this.toggleQuickBarShortcutTextBox).toBeEmpty();

    // Old versions of Edge only show a clear button when a shortcut is set
    if (await this.editToggleQuickBarShortcut.isVisible()) {
      await this.editToggleQuickBarShortcut.click();
    }

    await this.toggleQuickBarShortcutTextBox.press(`${modifierKey}+m`);

    // Newest version of chrome replaces ⌘ with "Command" in the displayed shortcut
    await expect(this.toggleQuickBarShortcutTextBox).toHaveValue(/M$/);
  }
}
