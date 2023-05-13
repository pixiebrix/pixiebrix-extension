/* eslint-disable new-cap -- using exposed TEST_ methods */
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
import {
  fromJS,
  type TriggerConfig,
  type TriggerDefinition,
} from "@/extensionPoints/triggerExtension";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/registryTypes";
import { type PersistedExtension } from "@/types/extensionTypes";
import { type BlockPipeline } from "@/blocks/types";
import { RootReader, tick } from "@/extensionPoints/extensionPointTestUtils";
import blockRegistry from "@/blocks/registry";
import { resolveExtensionInnerDefinitions } from "@/registry/internal";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

let extensionPointRegistry: any;
let loadOptionsMock: jest.Mock;
let lifecycleModule: any;

const rootReader = new RootReader();

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<ExtensionPointConfig<TriggerDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: "Test Extension Point",
      } as Metadata),
    definition: define<TriggerDefinition>({
      type: "trigger",
      background: false,
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<PersistedExtension<TriggerConfig>>({
  apiVersion: "v3",
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<TriggerConfig>({
    action: () => [] as BlockPipeline,
  }),
  _unresolvedExtensionBrand: null,
  createTimestamp: new Date().toISOString(),
  updateTimestamp: new Date().toISOString(),
  active: true,
});

describe("lifecycle", () => {
  beforeEach(() => {
    jest.isolateModules(() => {
      jest.mock("@/store/extensionsStorage", () => ({
        loadOptions: jest
          .fn()
          .mockRejectedValue(new Error("Mock not implemented")),
      }));

      lifecycleModule = require("@/contentScript/lifecycle");
      extensionPointRegistry = require("@/extensionPoints/registry").default;
      loadOptionsMock = require("@/store/extensionsStorage").loadOptions;
    });

    window.document.body.innerHTML = "";
    document.body.innerHTML = "";
    blockRegistry.clear();
    blockRegistry.register([rootReader]);
    rootReader.readCount = 0;
    rootReader.ref = undefined;
  });

  it("getActiveExtensionPoints smoke test", () => {
    expect(lifecycleModule.getActiveExtensionPoints()).toEqual([]);
  });

  it("first navigation no extensions smoke test", async () => {
    loadOptionsMock.mockResolvedValue({ extensions: [] });

    await lifecycleModule.handleNavigate();
    expect(loadOptionsMock).toHaveBeenCalledTimes(1);

    // No navigation has occurred, so no extensions should be loaded
    await lifecycleModule.handleNavigate();
    expect(loadOptionsMock).toHaveBeenCalledTimes(1);

    await lifecycleModule.handleNavigate();
    // Still only called once because loadPersistedExtensionsOnce is memoized
    expect(loadOptionsMock).toHaveBeenCalledTimes(1);
  });

  it("installs persisted trigger on first run", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
      })()
    );

    extensionPointRegistry.register([extensionPoint]);
    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    loadOptionsMock.mockResolvedValue({ extensions: [extension] });

    // Sanity check for the test
    expect(loadOptionsMock).toHaveBeenCalledTimes(0);
    await lifecycleModule.handleNavigate();

    await tick();

    expect(lifecycleModule.getActiveExtensionPoints()).toEqual([
      extensionPoint,
    ]);
  });

  it("runEditorExtension", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
      })()
    );

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.addExtension(
      await resolveExtensionInnerDefinitions(extension)
    );

    await lifecycleModule.runEditorExtension(extension.id, extensionPoint);

    expect(lifecycleModule.getActiveExtensionPoints()).toEqual([
      extensionPoint,
    ]);
    expect(lifecycleModule.TEST_getPersistedExtensions().size).toBe(0);
    expect(lifecycleModule.TEST_getEditorExtensions().size).toBe(1);
  });

  it("runEditorExtension removes existing", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
      })()
    );

    extensionPointRegistry.register([extensionPoint]);

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    loadOptionsMock.mockResolvedValue({ extensions: [extension] });

    // Sanity check for the test
    expect(loadOptionsMock).toHaveBeenCalledTimes(0);
    await lifecycleModule.handleNavigate();

    await tick();

    // Ensure the persisted extension is loaded
    expect(lifecycleModule.TEST_getPersistedExtensions().size).toBe(1);
    expect(lifecycleModule.getActiveExtensionPoints()).toEqual([
      extensionPoint,
    ]);

    extensionPoint.addExtension(
      await resolveExtensionInnerDefinitions(extension)
    );

    await lifecycleModule.runEditorExtension(extension.id, extensionPoint);

    // Still only a single extension point
    expect(lifecycleModule.getActiveExtensionPoints()).toEqual([
      extensionPoint,
    ]);

    expect(lifecycleModule.TEST_getPersistedExtensions().size).toBe(0);
    expect(lifecycleModule.TEST_getEditorExtensions().size).toBe(1);

    await lifecycleModule.handleNavigate({ force: true });
    await tick();

    // Persisted extension is not re-added on force-add
    expect(lifecycleModule.TEST_getPersistedExtensions().size).toBe(0);
    expect(lifecycleModule.TEST_getEditorExtensions().size).toBe(1);
  });
});
