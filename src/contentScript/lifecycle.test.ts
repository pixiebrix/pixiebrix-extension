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

import { loadOptions } from "@/store/extensionsStorage";
import { uuidSequence } from "@/testUtils/factories";
import extensionPointRegistry from "@/extensionPoints/registry";
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

jest.mock("@/store/extensionsStorage", () => ({
  loadOptions: jest.fn().mockResolvedValue({ extensions: [] }),
}));

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

jest.mock("@/utils/injectScriptTag", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ remove: jest.fn() }),
}));

const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

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
      lifecycleModule = require("@/contentScript/lifecycle");
    });

    loadOptionsMock.mockReset();

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
});
