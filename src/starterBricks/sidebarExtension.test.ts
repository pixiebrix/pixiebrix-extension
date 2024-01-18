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
import {
  autoUUIDSequence,
  registryIdFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { type BrickPipeline } from "@/bricks/types";
import {
  fromJS,
  type SidebarConfig,
  type SidebarDefinition,
} from "@/starterBricks/sidebarExtension";
import { RunReason } from "@/types/runtimeTypes";
import { RootReader, tick } from "@/starterBricks/starterBrickTestUtils";
import {
  getReservedPanelEntries,
  sidebarShowEvents,
} from "@/contentScript/sidebarController";
import { setPageState } from "@/contentScript/pageState";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { PANEL_FRAME_ID } from "@/domConstants";
import brickRegistry from "@/bricks/registry";
import { sleep } from "@/utils/timeUtils";

const rootReader = new RootReader();

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<SidebarDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
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
  beforeEach(() => {
    brickRegistry.clear();
    brickRegistry.register([rootReader]);
    rootReader.readCount = 0;
  });

  it("reserves panel on load", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      }),
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
      modActivationPanel: null,
    });

    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    // Not run until shown
    expect(rootReader.readCount).toBe(0);

    extensionPoint.uninstall();
  });

  it("synchronize clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.synchronizeModComponents([]);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });

  it("remove clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.registerModComponent(extension);

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.removeModComponent(extension.id);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });

  it("runs non-debounced state change trigger", async () => {
    const extensionPoint = fromJS(
      starterBrickFactory({
        trigger: "statechange",
      })(),
    );

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
      _recipe: modMetadataFactory(),
    });

    extensionPoint.registerModComponent(extension);

    await extensionPoint.install();

    expect(rootReader.readCount).toBe(0);

    setPageState({
      namespace: "blueprint",
      data: {},
      mergeStrategy: "replace",
      extensionId: extension.id,
      blueprintId: extension._recipe.id,
    });

    // Doesn't run because sidebar is not visible
    expect(rootReader.readCount).toBe(0);

    // Fake the sidebar being added to the page
    $(document.body).append(`<div id="${PANEL_FRAME_ID}"></div>`);
    sidebarShowEvents.emit({ reason: RunReason.MANUAL });

    await tick();

    // Runs because statechange mods also run on manual
    expect(rootReader.readCount).toBe(1);

    setPageState({
      namespace: "blueprint",
      // Data needs to be different than previous to trigger a state change event
      data: { foo: 42 },
      mergeStrategy: "replace",
      extensionId: extension.id,
      blueprintId: extension._recipe.id,
    });

    await tick();

    expect(rootReader.readCount).toBe(2);

    // Should ignore state change from other mod
    setPageState({
      namespace: "blueprint",
      data: {},
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: registryIdFactory(),
    });

    await tick();

    expect(rootReader.readCount).toBe(2);

    extensionPoint.uninstall();
  });

  it("debounces the statechange trigger", async () => {
    // :shrug: would be better to use fake timers here
    const debounceMillis = 100;

    const extensionPoint = fromJS(
      starterBrickFactory({
        trigger: "statechange",
        debounce: {
          waitMillis: debounceMillis,
          trailing: true,
        },
      })(),
    );

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
      _recipe: modMetadataFactory(),
    });

    extensionPoint.registerModComponent(extension);

    await extensionPoint.install();

    // Fake the sidebar being added to the page
    $(document.body).append(`<div id="${PANEL_FRAME_ID}"></div>`);
    sidebarShowEvents.emit({ reason: RunReason.MANUAL });

    await tick();

    // Runs immediately because it's the first run
    expect(rootReader.readCount).toBe(1);

    for (let i = 0; i < 10; i++) {
      setPageState({
        namespace: "blueprint",
        data: { foo: i },
        mergeStrategy: "replace",
        extensionId: extension.id,
        blueprintId: extension._recipe.id,
      });
    }

    await sleep(debounceMillis);
    await tick();

    expect(rootReader.readCount).toBe(2);

    extensionPoint.uninstall();
  });
});
