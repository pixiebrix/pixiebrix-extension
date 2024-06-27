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

import { define } from "cooky-cutter";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/registryTypes";
import { type BrickPipeline } from "@/bricks/types";
import { RootReader } from "@/starterBricks/starterBrickTestUtils";
import blockRegistry from "@/bricks/registry";
import { fromJS } from "@/starterBricks/contextMenu/contextMenuStarterBrick";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { RunReason } from "@/types/runtimeTypes";
import {
  uninstallContextMenu,
  ensureContextMenu,
} from "@/background/messenger/api";
import { getPlatform } from "@/platform/platformContext";
import {
  type ContextMenuDefinition,
  type ContextMenuConfig,
} from "@/starterBricks/contextMenu/contextMenuTypes";

const uninstallContextMenuMock = jest.mocked(uninstallContextMenu);
const ensureContextMenuMock = jest.mocked(ensureContextMenu);

const rootReader = new RootReader();

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickDefinitionLike<ContextMenuDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
    definition: define<ContextMenuDefinition>({
      type: "contextMenu",
      contexts: () => ["page"] as any,
      targetMode: "document",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const modComponentFactory = define<HydratedModComponent<ContextMenuConfig>>({
  apiVersion: "v3",
  _hydratedModComponentBrand: undefined as never,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: undefined,
  label: "Test Extension",
  config: define<ContextMenuConfig>({
    title: "Test Menu Item",
    action: () => [] as BrickPipeline,
  }),
});

beforeEach(() => {
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = null;
  jest.resetAllMocks();
});

describe("contextMenuStarterBrick", () => {
  it("should add extension once", async () => {
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());
    const modComponent = modComponentFactory();

    starterBrick.registerModComponent(modComponent);
    starterBrick.registerModComponent(modComponent);

    expect(starterBrick.registeredModComponents).toStrictEqual([modComponent]);
  });

  it("should include context menu props in schema", async () => {
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());
    const reader = await starterBrick.defaultReader();
    expect(reader.outputSchema.properties).toHaveProperty("selectionText");
  });

  it("should include context menu props in preview", async () => {
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());
    const reader = await starterBrick.previewReader();
    const value = await reader.read(document);
    expect(value).toHaveProperty("selectionText");
  });

  it("should register context menu on run", async () => {
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());
    const modComponent = modComponentFactory();

    starterBrick.registerModComponent(modComponent);

    await starterBrick.install();

    expect(ensureContextMenuMock).not.toHaveBeenCalled();

    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(ensureContextMenuMock).toHaveBeenCalledOnce();
    expect(ensureContextMenuMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        extensionId: modComponent.id,
      }),
    );
  });

  it("should remove from UI from all tabs on sync", async () => {
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());
    const modComponent = modComponentFactory();
    starterBrick.registerModComponent(modComponent);

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    // Not read until the menu is actually run
    expect(rootReader.readCount).toBe(0);

    starterBrick.synchronizeModComponents([]);

    expect(starterBrick.registeredModComponents).toHaveLength(0);

    expect(uninstallContextMenuMock).toHaveBeenCalledExactlyOnceWith({
      extensionId: modComponent.id,
    });
  });
});
