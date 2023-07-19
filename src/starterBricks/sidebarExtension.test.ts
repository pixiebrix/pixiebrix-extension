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
import { type UnknownObject } from "@/types/objectTypes";
import { define } from "cooky-cutter";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/registryTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type BrickPipeline } from "@/bricks/types";
import {
  fromJS,
  type SidebarConfig,
  type SidebarDefinition,
} from "@/starterBricks/sidebarExtension";
import { RunReason } from "@/types/runtimeTypes";
import { RootReader } from "@/starterBricks/starterBrickTestUtils";
import { getReservedPanelEntries } from "@/contentScript/sidebarController";

const rootReader = new RootReader();

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<SidebarDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      } as Metadata),
    definition: define<SidebarDefinition>({
      type: "actionPanel",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedModComponent<SidebarConfig>>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<SidebarConfig>({
    heading: "Test Action",
    body: () => [] as BrickPipeline,
  }),
});

describe("sidebarExtension", () => {
  it("reserves panel on load", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.registerComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();

    // To avoid race condition, it reserves panels in the install method in addition to the run method
    expect(getReservedPanelEntries()).toStrictEqual({
      forms: [],
      panels: [
        expect.objectContaining({
          extensionPointId: extensionPoint.id,
        }),
      ],
      temporaryPanels: [],
      recipeToActivate: null,
    });

    await extensionPoint.runComponents({ reason: RunReason.MANUAL });

    // Not run until shown
    expect(rootReader.readCount).toBe(0);

    extensionPoint.uninstall();
  });

  it("synchronize clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.registerComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.synchronizeComponents([]);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });

  it("remove clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.registerComponent(extension);

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.removeComponent(extension.id);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });
});
