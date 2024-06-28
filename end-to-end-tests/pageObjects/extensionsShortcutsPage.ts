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
import { getModifierKey, getModifierSymbol } from "end-to-end-tests/utils";
import { BasePageObject } from "./basePageObject";

function getExtensionShortcutsUrl(chromiumChannel: "chrome" | "msedge") {
  switch (chromiumChannel) {
    case "chrome": {
      return "chrome://extensions/shortcuts";
    }

    case "msedge": {
      return "edge://extensions/shortcuts";
    }

    default: {
      const exhaustiveCheck: never = chromiumChannel;
      throw new Error(`Unexpected channel: ${exhaustiveCheck}`);
    }
  }
}

async function getShortcut(page: Page): Promise<string> {
  const modifierKey = await getModifierKey(page);
  const modifierSymbol = await getModifierSymbol(page);

  return modifierKey === "Meta" ? `${modifierSymbol}M` : "Ctrl + M";
}

export class ExtensionsShortcutsPage extends BasePageObject {
  private readonly pageUrl: string;

  constructor(
    page: Page,
    private readonly chromiumChannel: "chrome" | "msedge",
  ) {
    super(page);
    this.pageUrl = getExtensionShortcutsUrl(this.chromiumChannel);
  }

  getPageUrl() {
    return this.pageUrl;
  }

  async goto() {
    await this.page.goto(this.pageUrl);

    if (this.chromiumChannel === "chrome") {
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

    if (this.chromiumChannel === "chrome") {
      await expect(this.page.getByPlaceholder(/shortcut set: /i)).toHaveValue(
        shortcut,
      );

      // Clear the shortcut
      await this.getByLabel("Edit shortcut Toggle Quick").click();
      await this.locator("extensions-keyboard-shortcuts #container").click();

      await expect(
        this.getByLabel(/Shortcut Toggle Quick Bar for PixieBrix/, {
          exact: true,
        }),
      ).toBeEmpty();
    } else {
      await expect(
        this.getByLabel(
          /Type a shortcut that will Toggle Quick Bar for PixieBrix/,
        ),
      ).toHaveValue(shortcut);

      await this.getByRole("button", { name: "Clear shortcut" }).click();

      await expect(
        this.getByLabel(
          /Type a shortcut that will Toggle Quick Bar for PixieBrix/,
        ),
      ).toBeEmpty();
    }
  }

  async setQuickbarShortcut() {
    await this.page.bringToFront();

    const modifierKey = await getModifierKey(this.page);
    const shortcut = await getShortcut(this.page);

    if (this.chromiumChannel === "chrome") {
      await expect(
        this.getByLabel(/Shortcut Toggle Quick Bar for PixieBrix/),
      ).toBeEmpty();

      await this.getByLabel("Edit shortcut Toggle Quick").click();
      await this.getByPlaceholder("Type a shortcut").press(`${modifierKey}+m`);

      await this.locator("extensions-keyboard-shortcuts #container").click();

      await expect(this.getByPlaceholder(/shortcut set: /i)).toHaveValue(
        shortcut,
      );
    } else {
      const shortcutLabel = /type a shortcut that will toggle quick bar/i;
      const input = this.getByLabel(shortcutLabel);

      await expect(input).toBeEmpty();

      await input.click();
      await input.press(`${modifierKey}+m`);

      await this.getByText("Keyboard ShortcutsPixieBrix").click();

      await expect(input).toHaveValue(shortcut);
    }
  }
}
