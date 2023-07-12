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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import {
  autoModUpdatesEnabled,
  collectModVersions,
  deactivateMod,
  fetchModUpdates,
  getActivatedMarketplaceModMetadata,
} from "@/background/modUpdater";
import reportError from "@/telemetry/reportError";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import {
  extensionFactory,
  persistedExtensionFactory,
} from "@/testUtils/factories/extensionFactories";
import type { RegistryId, SemVerString, Sharing } from "@/types/registryTypes";
import type { IExtension, ActivatedModComponent } from "@/types/extensionTypes";
import {
  extensionPointDefinitionFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories/recipeFactories";

const axiosMock = new MockAdapter(axios);
jest.mock("@/telemetry/reportError", () => jest.fn());

describe("autoModUpdatesEnabled function", () => {
  it("should return false if flag absent", async () => {
    axiosMock.onGet().reply(200, {
      flags: [],
    });

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(false);
  });

  it("should return true if flag present", async () => {
    axiosMock.onGet().reply(200, {
      flags: ["automatic-mod-updates"],
    });

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(true);
  });

  it("should return false on error", async () => {
    axiosMock.onGet().reply(400, {});

    const result = await autoModUpdatesEnabled();

    expect(result).toBe(false);
    expect(reportError).toHaveBeenCalled();
  });
});

describe("getActivatedMarketplaceMods function", () => {
  let publicActivatedMod: ActivatedModComponent;
  let privateActivatedMod: ActivatedModComponent;
  let publicActivatedDeployment: ActivatedModComponent;
  let privateActivatedDeployment: ActivatedModComponent;

  beforeEach(async () => {
    await saveOptions({ extensions: [] });

    publicActivatedMod = persistedExtensionFactory({
      _recipe: {
        sharing: {
          public: true,
        } as Sharing,
      } as IExtension["_recipe"],
    });

    privateActivatedMod = persistedExtensionFactory({
      _recipe: {
        sharing: {
          public: false,
        } as Sharing,
      } as IExtension["_recipe"],
    });

    publicActivatedDeployment = persistedExtensionFactory({
      _recipe: {
        sharing: {
          public: true,
        } as Sharing,
      } as IExtension["_recipe"],
      _deployment: {} as IExtension["_deployment"],
    });

    privateActivatedDeployment = persistedExtensionFactory({
      _recipe: {
        sharing: {
          public: false,
        } as Sharing,
      } as IExtension["_recipe"],
      _deployment: {} as IExtension["_deployment"],
    });
  });

  it("should return empty list if no activated mods", async () => {
    const result = await getActivatedMarketplaceModMetadata();
    expect(result).toEqual([]);
  });

  it("should only return public mods without deployments", async () => {
    await saveOptions({
      extensions: [
        publicActivatedMod,
        privateActivatedMod,
        publicActivatedDeployment,
        privateActivatedDeployment,
      ],
    });

    const result = await getActivatedMarketplaceModMetadata();
    expect(result).toEqual([publicActivatedMod._recipe]);
  });
});

describe("fetchModUpdates function", () => {
  it("calls the registry/updates/ endpoint with the right payload", async () => {
    const activatedMods = [
      recipeMetadataFactory() as IExtension["_recipe"],
      recipeMetadataFactory() as IExtension["_recipe"],
    ];

    axiosMock.onPost().reply(200, {});

    await fetchModUpdates(activatedMods);

    expect(axiosMock.history.post.length).toBe(1);
    const payload = JSON.parse(String(axiosMock.history.post[0].data));

    expect(payload).toEqual({
      versions: {
        [activatedMods[0].id]: activatedMods[0].version,
        [activatedMods[1].id]: activatedMods[1].version,
      },
    });
  });

  it("reports error and returns empty object on failure", async () => {
    const activatedMods = [
      recipeMetadataFactory() as IExtension["_recipe"],
      recipeMetadataFactory() as IExtension["_recipe"],
    ];

    axiosMock.onPost().reply(400, {});

    const result = await fetchModUpdates(activatedMods);

    expect(result).toEqual({});
    expect(reportError).toHaveBeenCalled();
  });
});

describe("collectModVersions function", () => {
  it("returns empty object if no activated mods", () => {
    const result = collectModVersions([]);
    expect(result).toEqual({});
  });

  it("returns expected object with registry id keys and version number values", () => {
    const activatedMods = [
      recipeMetadataFactory() as IExtension["_recipe"],
      recipeMetadataFactory() as IExtension["_recipe"],
    ];

    const result = collectModVersions(activatedMods);
    expect(result).toEqual({
      [activatedMods[0].id]: activatedMods[0].version,
      [activatedMods[1].id]: activatedMods[1].version,
    });
  });

  it("reports error and returns object if same mod has multiple versions", async () => {
    const activatedMods = [
      recipeMetadataFactory({
        id: "@test/same-mod" as RegistryId,
        version: "1.0.0" as SemVerString,
      }) as IExtension["_recipe"],
      recipeMetadataFactory({
        id: "@test/same-mod" as RegistryId,
        version: "2.0.0" as SemVerString,
      }) as IExtension["_recipe"],
    ];

    const result = collectModVersions(activatedMods);
    expect(result).toEqual({ "@test/same-mod": "2.0.0" });
    expect(reportError).toHaveBeenCalled();
  });
});

describe("deactivateMod function", () => {
  let modToDeactivate: IExtension["_recipe"];

  beforeEach(async () => {
    modToDeactivate = recipeMetadataFactory({}) as IExtension["_recipe"];
    const anotherMod = recipeMetadataFactory({}) as IExtension["_recipe"];

    await saveOptions({
      extensions: [
        extensionFactory({
          _recipe: modToDeactivate,
        }) as ActivatedModComponent,
        extensionFactory({
          _recipe: modToDeactivate,
        }) as ActivatedModComponent,
        extensionFactory({
          _recipe: anotherMod,
        }) as ActivatedModComponent,
      ],
    });
  });

  it("should remove the mod components from the options state", async () => {
    const priorState = await loadOptions();

    const { options: resultingState, deactivatedModComponents } = deactivateMod(
      modToDeactivate.id,
      priorState
    );

    expect(deactivatedModComponents.length).toEqual(2);
    expect(deactivatedModComponents[0]._recipe.id).toEqual(modToDeactivate.id);
    expect(deactivatedModComponents[1]._recipe.id).toEqual(modToDeactivate.id);
    expect(resultingState.extensions.length).toEqual(1);
  });

  it("should do nothing if mod id does not have any activated mod components", async () => {
    const extensionPoint = extensionPointDefinitionFactory();
    const extension = extensionFactory({
      extensionPointId: extensionPoint.metadata.id,
      _recipe: recipeMetadataFactory({}) as IExtension["_recipe"],
    }) as ActivatedModComponent;

    await saveOptions({
      extensions: [extension],
    });

    const priorState = await loadOptions();

    const { options: resultingState, deactivatedModComponents } = deactivateMod(
      "@test/id-doesnt-exist" as RegistryId,
      priorState
    );

    expect(deactivatedModComponents).toEqual([]);
    expect(resultingState.extensions).toEqual(priorState.extensions);
  });
});
