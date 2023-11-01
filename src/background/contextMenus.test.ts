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
import extensionPointRegistry from "@/starterBricks/registry";
import {
  type ContextMenuConfig,
  fromJS,
  type MenuDefinition,
} from "@/starterBricks/contextMenu";
import * as backgroundApi from "@/background/messenger/api";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type ModComponentBase } from "@/types/modComponentTypes";
import chromeP from "webext-polyfill-kinda";
import { setContext } from "@/__mocks__/webext-detect-page";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { starterBrickConfigFactory } from "@/testUtils/factories/modDefinitionFactories";

setContext("background");

jest.mock("webext-polyfill-kinda", () => ({
  contextMenus: {
    create: jest.fn().mockRejectedValue(new Error("Not Implemented")),
  },
}));

(browser.contextMenus as any) = {
  update: jest.fn(),
};

const updateMenuMock = jest.mocked(browser.contextMenus.update);
const createMenuMock = jest.mocked(chromeP.contextMenus.create);
const ensureContextMenuMock = jest.mocked(backgroundApi.ensureContextMenu);

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

  it("don't fail on missing starter brick", async () => {
    // Unknown starter brick
    const menuModComponent = modComponentFactory();
    await preloadContextMenus([menuModComponent]);
    expect(updateMenuMock).not.toHaveBeenCalled();
    expect(createMenuMock).not.toHaveBeenCalled();
  });

  it("preload context menu", async () => {
    const extensionPoint =
      starterBrickConfigFactory() as unknown as StarterBrickConfig<MenuDefinition>;
    extensionPoint.definition.type = "contextMenu";
    extensionPoint.definition.contexts = ["all"];

    updateMenuMock.mockRejectedValue(new Error("My Error"));

    extensionPointRegistry.register([fromJS(extensionPoint)]);

    const menuModComponent = modComponentFactory({
      extensionPointId: extensionPoint.metadata.id,
    }) as ModComponentBase<ContextMenuConfig>;
    menuModComponent.config.title = "Test Menu";

    await preloadContextMenus([menuModComponent]);
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
