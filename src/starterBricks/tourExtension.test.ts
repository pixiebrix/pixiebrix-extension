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
import { type BrickPipeline } from "@/bricks/types";
import {
  type TourConfig,
  type TourDefinition,
  fromJS,
} from "@/starterBricks/tourExtension";
import { RootReader, tick } from "@/starterBricks/starterBrickTestUtils";
import blockRegistry from "@/bricks/registry";
import { isTourInProgress } from "@/starterBricks/tourController";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import defaultActions, {
  pageEditorAction,
} from "@/components/quickBar/defaultActions";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { initQuickBarApp } from "@/components/quickBar/QuickBarApp";

const rootReader = new RootReader();

jest.mock("@/auth/token", () => ({
  __esModule: true,
  ...jest.requireActual("@/auth/token"),
  readAuthData: jest.fn().mockResolvedValue({
    flags: [],
  }),
}));

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<TourDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      } as Metadata),
    definition: define<TourDefinition>({
      type: "tour",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedModComponent<TourConfig>>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<TourConfig>({
    tour: () => [] as BrickPipeline,
  }),
});

beforeEach(() => {
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

const NUM_DEFAULT_QUICKBAR_ACTIONS = [...defaultActions, pageEditorAction]
  .length;

describe("tourExtension", () => {
  test("install tour via Page Editor", async () => {
    const starterBrick = fromJS(starterBrickFactory()());

    starterBrick.registerModComponent(
      extensionFactory({
        extensionPointId: starterBrick.id,
      })
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.PAGE_EDITOR });

    await tick();

    expect(isTourInProgress()).toBe(false);
    expect(rootReader.readCount).toBe(1);

    starterBrick.uninstall();
  });

  test("register tour with quick bar", async () => {
    await initQuickBarApp();

    const extensionPoint = fromJS(
      starterBrickFactory({ allowUserRun: true, autoRunSchedule: "never" })()
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.INITIAL_LOAD });

    await tick();

    // Shouldn't be run because autoRunSchedule: never
    expect(isTourInProgress()).toBe(false);
    expect(rootReader.readCount).toBe(0);

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS + 1
    );
    extensionPoint.uninstall();
    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );
  });
});
