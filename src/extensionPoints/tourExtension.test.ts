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
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/registryTypes";
import { type BlockPipeline } from "@/blocks/types";
import {
  type TourConfig,
  type TourDefinition,
  fromJS,
} from "@/extensionPoints/tourExtension";
import { RootReader, tick } from "@/extensionPoints/extensionPointTestUtils";
import blockRegistry from "@/blocks/registry";
import { isTourInProgress } from "@/extensionPoints/tourController";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import defaultActions from "@/components/quickBar/defaultActions";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { RunReason } from "@/types/runtimeTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

const rootReader = new RootReader();

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<ExtensionPointConfig<TourDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: "Test Extension Point",
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

const extensionFactory = define<ResolvedExtension<TourConfig>>({
  apiVersion: "v3",
  _resolvedExtensionBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<TourConfig>({
    tour: () => [] as BlockPipeline,
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

describe("tourExtension", () => {
  test("install tour via Page Editor", async () => {
    const extensionPoint = fromJS(extensionPointFactory()());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.PAGE_EDITOR });

    await tick();

    expect(isTourInProgress()).toBe(false);
    expect(rootReader.readCount).toBe(1);

    extensionPoint.uninstall();
  });

  test("register tour with quick bar", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({ allowUserRun: true, autoRunSchedule: "never" })()
    );

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.INITIAL_LOAD });

    await tick();

    // Shouldn't be run because autoRunSchedule: never
    expect(isTourInProgress()).toBe(false);
    expect(rootReader.readCount).toBe(0);

    expect(quickBarRegistry.currentActions).toHaveLength(
      defaultActions.length + 1
    );
    extensionPoint.uninstall();
    expect(quickBarRegistry.currentActions).toHaveLength(defaultActions.length);
  });
});
