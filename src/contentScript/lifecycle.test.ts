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
import {
  fromJS,
  type TriggerConfig,
  type TriggerDefinition,
} from "@/starterBricks/trigger/triggerStarterBrick";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata, DefinitionKinds } from "@/types/registryTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type BrickPipeline } from "@/bricks/types";
import { RootReader, tick } from "@/starterBricks/starterBrickTestUtils";
import brickRegistry from "@/bricks/registry";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import {
  timestampFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { type getModComponentState } from "@/store/modComponents/modComponentStorage";
import { getPlatform } from "@/platform/platformContext";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { RunReason } from "@/types/runtimeTypes";

let starterBrickRegistry: any;
let lifecycleModule: any;

let getModComponentStateMock: jest.MockedFunctionDeep<
  typeof getModComponentState
>;

const rootReader = new RootReader();

const starterBrickDefinitionFactory = (
  definitionOverrides: UnknownObject = {},
) =>
  define<StarterBrickDefinitionLike<TriggerDefinition>>({
    apiVersion: "v3",
    kind: DefinitionKinds.STARTER_BRICK,
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
    definition: define<TriggerDefinition>({
      type: StarterBrickTypes.TRIGGER,
      background: false,
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const activatedModComponentFactory = define<
  ActivatedModComponent<TriggerConfig>
>({
  apiVersion: "v3",
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  modMetadata: modMetadataFactory,
  deploymentMetadata: undefined,
  label: "Test Mod Component",
  config: define<TriggerConfig>({
    action: () => [] as BrickPipeline,
  }),
  _serializedModComponentBrand: null as never,
  createTimestamp: timestampFactory,
  updateTimestamp: timestampFactory,
  active: true,
});

describe("lifecycle", () => {
  beforeEach(() => {
    jest.isolateModules(() => {
      jest.mock("@/store/modComponents/modComponentStorage", () => ({
        getModComponentState: jest
          .fn()
          .mockRejectedValue(new Error("Mock not implemented")),
      }));

      lifecycleModule = require("@/contentScript/lifecycle");
      starterBrickRegistry = require("@/starterBricks/registry").default;
      getModComponentStateMock =
        require("@/store/modComponents/modComponentStorage").getModComponentState;
    });

    window.document.body.innerHTML = "";
    document.body.innerHTML = "";
    brickRegistry.clear();
    brickRegistry.register([rootReader]);
    rootReader.readCount = 0;
    rootReader.ref = null;
  });

  it("getRunningStarterBricks smoke test", () => {
    expect(lifecycleModule.getRunningStarterBricks()).toEqual([]);
  });

  it("first navigation no extensions smoke test", async () => {
    getModComponentStateMock.mockResolvedValue({ activatedModComponents: [] });

    await lifecycleModule.handleNavigate();
    expect(getModComponentStateMock).toHaveBeenCalledTimes(1);

    // No navigation has occurred, so no extensions should be loaded
    await lifecycleModule.handleNavigate();
    expect(getModComponentStateMock).toHaveBeenCalledTimes(1);

    await lifecycleModule.handleNavigate();
    // Still only called once because loadActivatedModComponentsOnce is memoized
    expect(getModComponentStateMock).toHaveBeenCalledTimes(1);
  });

  it("installs activated trigger on first run", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickDefinitionFactory({
        trigger: "load",
      })(),
    );

    starterBrickRegistry.register([starterBrick]);
    const modComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.id,
    });

    getModComponentStateMock.mockResolvedValue({
      activatedModComponents: [modComponent],
    });

    // Sanity check for the test
    expect(getModComponentStateMock).toHaveBeenCalledTimes(0);
    await lifecycleModule.handleNavigate();

    await tick();

    expect(lifecycleModule.getRunningStarterBricks()).toEqual([starterBrick]);
  });

  it("runDraftModComponent", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickDefinitionFactory({
        trigger: "load",
      })(),
    );

    const modComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.id,
    });

    starterBrick.registerModComponent(
      await hydrateModComponentInnerDefinitions(modComponent),
    );

    await lifecycleModule.runDraftModComponent(modComponent.id, starterBrick, {
      runReason: RunReason.PAGE_EDITOR_RUN,
    });

    expect(lifecycleModule.getRunningStarterBricks()).toEqual([starterBrick]);
    expect(
      lifecycleModule.TEST_getActivatedModComponentStarterBrickMap().size,
    ).toBe(0);
    expect(
      lifecycleModule.TEST_getDraftModComponentStarterBrickMap().size,
    ).toBe(1);
  });

  it("runDraftModComponent removes existing", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickDefinitionFactory({
        trigger: "load",
      })(),
    );

    starterBrickRegistry.register([starterBrick]);

    const modComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.id,
    });

    getModComponentStateMock.mockResolvedValue({
      activatedModComponents: [modComponent],
    });

    // Sanity check for the test
    expect(getModComponentStateMock).toHaveBeenCalledTimes(0);
    await lifecycleModule.handleNavigate();

    await tick();

    // Ensure the activated mod component is loaded
    expect(
      lifecycleModule.TEST_getActivatedModComponentStarterBrickMap().size,
    ).toBe(1);
    expect(lifecycleModule.getRunningStarterBricks()).toEqual([starterBrick]);

    starterBrick.registerModComponent(
      await hydrateModComponentInnerDefinitions(modComponent),
    );

    await lifecycleModule.runDraftModComponent(modComponent.id, starterBrick, {
      runReason: RunReason.PAGE_EDITOR_RUN,
    });

    // Still only a single starter brick
    expect(lifecycleModule.getRunningStarterBricks()).toEqual([starterBrick]);

    expect(
      lifecycleModule.TEST_getActivatedModComponentStarterBrickMap().size,
    ).toBe(0);
    expect(
      lifecycleModule.TEST_getDraftModComponentStarterBrickMap().size,
    ).toBe(1);

    await lifecycleModule.handleNavigate({ force: true });
    await tick();

    // Activated mod component is not re-added on force-add
    expect(
      lifecycleModule.TEST_getActivatedModComponentStarterBrickMap().size,
    ).toBe(0);
    expect(
      lifecycleModule.TEST_getDraftModComponentStarterBrickMap().size,
    ).toBe(1);
  });

  it("Removes starter bricks from deactivated mods", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickDefinitionFactory({
        trigger: "load",
      })(),
    );

    starterBrickRegistry.register([starterBrick]);

    const modComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.id,
    });

    getModComponentStateMock.mockResolvedValue({
      activatedModComponents: [modComponent],
    });

    await lifecycleModule.handleNavigate();

    await tick();

    expect(lifecycleModule.getRunningStarterBricks()).toEqual([starterBrick]);

    const updatedStarterBrick = fromJS(
      getPlatform(),
      starterBrickDefinitionFactory({
        trigger: "initialize",
      })(),
    );

    // @ts-expect-error -- There's some weirdness going on with this starterBrickFactory;
    // it's not incrementing the starter brick id, nor is allowing the id to be passed as an override
    // https://github.com/pixiebrix/pixiebrix-extension/issues/5972
    updatedStarterBrick.id = "test/updated-starter-brick";

    starterBrickRegistry.register([updatedStarterBrick]);

    const updatedModComponent = activatedModComponentFactory({
      extensionPointId: updatedStarterBrick.id,
    });

    getModComponentStateMock.mockResolvedValue({
      activatedModComponents: [updatedModComponent],
    });
    lifecycleModule.queueReloadFrameMods();

    await lifecycleModule.handleNavigate({ force: true });
    await tick();

    // New starter brick is installed, old starter brick is removed
    expect(
      lifecycleModule.TEST_getActivatedModComponentStarterBrickMap().size,
    ).toBe(1);
    expect(lifecycleModule.getRunningStarterBricks()).toEqual([
      updatedStarterBrick,
    ]);
  });
});
