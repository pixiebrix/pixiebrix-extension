/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  preloadContextMenus,
  ensureContextMenu,
} from "@/background/contextMenus";
import {
  extensionFactory,
  extensionPointDefinitionFactory,
} from "@/testUtils/factories";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  type ContextMenuConfig,
  fromJS,
  type MenuDefinition,
} from "@/extensionPoints/contextMenu";
import * as backgroundApi from "@/background/messenger/api";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { type IExtension } from "@/types/extensionTypes";
import chromeP from "webext-polyfill-kinda";

jest.mock("webext-dynamic-content-scripts/distribution/active-tab");

jest.mock("webext-polyfill-kinda", () => ({
  contextMenus: {
    create: jest.fn().mockRejectedValue(new Error("Not Implemented")),
  },
}));

jest.mock("webext-detect-page", () => ({
  isDevToolsPage: () => false,
  isExtensionContext: () => true,
  isBackground: () => true,
  isBackgroundPage: () => true,
  isContentScript: () => false,
}));

(browser.contextMenus as any) = {
  update: jest.fn(),
};

const updateMenuMock = browser.contextMenus.update as jest.MockedFunction<
  typeof browser.contextMenus.update
>;
const createMenuMock = chromeP.contextMenus.create as jest.MockedFunction<
  typeof chromeP.contextMenus.create
>;
const ensureContextMenuMock =
  backgroundApi.ensureContextMenu as jest.MockedFunction<
    typeof backgroundApi.ensureContextMenu
  >;

describe("contextMenus", () => {
  beforeEach(() => {
    updateMenuMock.mockResolvedValue(undefined);
    ensureContextMenuMock.mockImplementation(ensureContextMenu);
  });

  it("empty preload", async () => {
    await preloadContextMenus([]);
    expect(updateMenuMock).not.toHaveBeenCalled();
    expect(createMenuMock).not.toHaveBeenCalled();
  });

  it("don't fail on missing extension point", async () => {
    // Unknown extension point
    const menuExtension = extensionFactory();
    await preloadContextMenus([menuExtension]);
    expect(updateMenuMock).not.toHaveBeenCalled();
    expect(createMenuMock).not.toHaveBeenCalled();
  });

  it("preload context menu", async () => {
    const extensionPoint =
      extensionPointDefinitionFactory() as unknown as ExtensionPointConfig<MenuDefinition>;
    extensionPoint.definition.type = "contextMenu";
    extensionPoint.definition.contexts = ["all"];

    updateMenuMock.mockRejectedValue(new Error("My Error"));

    extensionPointRegistry.register([fromJS(extensionPoint as any)]);

    const menuExtension = extensionFactory({
      extensionPointId: extensionPoint.metadata.id,
    }) as IExtension<ContextMenuConfig>;
    menuExtension.config.title = "Test Menu";

    await preloadContextMenus([menuExtension]);
    expect(updateMenuMock).toHaveBeenCalledWith(
      expect.stringMatching(/pixiebrix-\S+/),
      {
        contexts: ["all"],
        documentUrlPatterns: ["*://*/*", "https://www.mySite1.com/*"],
        title: "Test Menu",
        type: "normal",
      }
    );

    expect(createMenuMock).toHaveBeenCalledWith({
      id: expect.stringMatching(/pixiebrix-\S+/),
      contexts: ["all"],
      documentUrlPatterns: ["*://*/*", "https://www.mySite1.com/*"],
      title: "Test Menu",
      type: "normal",
    });
  });
});
