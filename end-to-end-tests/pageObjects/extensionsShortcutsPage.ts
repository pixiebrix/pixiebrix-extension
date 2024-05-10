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

  return modifierKey === "Meta" ? `${modifierSymbol}M` : `${modifierKey} + M`;
}

export class ExtensionsShortcutsPage {
  private readonly pageUrl: string;

  constructor(
    private readonly page: Page,
    private readonly chromiumChannel: "chrome" | "msedge",
  ) {
    this.pageUrl = getExtensionShortcutsUrl(this.chromiumChannel);
  }

  getPageUrl() {
    return this.pageUrl;
  }

  async goto() {
    await this.page.goto(this.pageUrl);

    if (this.chromiumChannel === "chrome") {
      await expect(
        this.page.getByRole("heading", { name: /PixieBrix/ }),
      ).toBeVisible();
    } else {
      await expect(this.page.getByText(/PixieBrix/)).toBeVisible();
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
      await this.page.getByLabel("Edit shortcut Toggle Quick").click();
      await this.page
        .locator("extensions-keyboard-shortcuts #container")
        .click();

      await expect(
        this.page.getByLabel(/Shortcut Toggle Quick Bar for PixieBrix/, {
          exact: true,
        }),
      ).toBeEmpty();
    } else {
      await expect(
        this.page.getByLabel(
          /Type a shortcut that will Toggle Quick Bar for PixieBrix/,
        ),
      ).toHaveValue(shortcut);

      await this.page.getByRole("button", { name: "Clear shortcut" }).click();

      await expect(
        this.page.getByLabel(
          "Type a shortcut that will Toggle Quick Bar for PixieBrix - Development extension",
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
        this.page.getByLabel(/Shortcut Toggle Quick Bar for PixieBrix/),
      ).toBeEmpty();

      await this.page.getByLabel("Edit shortcut Toggle Quick").click();
      await this.page
        .getByPlaceholder("Type a shortcut")
        .press(`${modifierKey}+m`);

      await this.page
        .locator("extensions-keyboard-shortcuts #container")
        .click();

      await expect(this.page.getByPlaceholder(/shortcut set: /i)).toHaveValue(
        shortcut,
      );
    } else {
      const input = this.page.getByLabel(
        /Type a shortcut that will Toggle Quick Bar for PixieBrix/,
      );

      await expect(input).toHaveValue("");

      await input.click();
      await input.press(`${modifierKey}+m`);

      await this.page.getByText("Keyboard ShortcutsPixieBrix").click();

      await expect(input).toHaveValue(shortcut);
    }
  }
}
