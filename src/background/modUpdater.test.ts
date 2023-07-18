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
  deactivateMod,
  fetchModUpdates,
  getActivatedMarketplaceModVersions,
  updateModsIfForceUpdatesAvailable,
} from "@/background/modUpdater";
import reportError from "@/telemetry/reportError";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import {
  installedRecipeMetadataFactory,
  persistedExtensionFactory,
} from "@/testUtils/factories/extensionFactories";
import type { RegistryId, SemVerString, Sharing } from "@/types/registryTypes";
import {
  extensionPointDefinitionFactory,
  versionedRecipeWithResolvedExtensions,
} from "@/testUtils/factories/recipeFactories";
import { getEditorState } from "@/store/dynamicElementStorage";
import extensionsSlice from "@/store/extensionsSlice";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";

const axiosMock = new MockAdapter(axios);
jest.mock("@/telemetry/reportError", () => jest.fn());
jest.mock("@/background/activeTab", () => ({
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

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

describe("getActivatedMarketplaceModVersions function", () => {
  let publicActivatedMod: ActivatedModComponent;
  let privateActivatedMod: ActivatedModComponent;
  let publicActivatedDeployment: ActivatedModComponent;
  let privateActivatedDeployment: ActivatedModComponent;

  beforeEach(async () => {
    await saveOptions({ extensions: [] });

    publicActivatedMod = persistedExtensionFactory({
      _recipe: installedRecipeMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
    });

    privateActivatedMod = persistedExtensionFactory({
      _recipe: installedRecipeMetadataFactory({
        sharing: sharingDefinitionFactory({ public: false }),
      }),
    });

    publicActivatedDeployment = persistedExtensionFactory({
      _recipe: installedRecipeMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
      _deployment: {} as ActivatedModComponent["_deployment"],
    });

    privateActivatedDeployment = persistedExtensionFactory({
      _recipe: installedRecipeMetadataFactory({
        sharing: sharingDefinitionFactory({ public: false }),
      }),
      _deployment: {} as ActivatedModComponent["_deployment"],
    });
  });

  it("should return empty list if no activated mods", async () => {
    const result = await getActivatedMarketplaceModVersions();
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

    const result = await getActivatedMarketplaceModVersions();
    expect(result).toEqual([
      {
        name: publicActivatedMod._recipe.id,
        version: publicActivatedMod._recipe.version,
      },
    ]);
  });

  it("returns expected object with registry id keys and version number values", async () => {
    const anotherPublicActivatedMod = persistedExtensionFactory({
      _recipe: installedRecipeMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
    });

    await saveOptions({
      extensions: [publicActivatedMod, anotherPublicActivatedMod],
    });

    const result = await getActivatedMarketplaceModVersions();

    expect(result).toEqual([
      {
        name: publicActivatedMod._recipe.id,
        version: publicActivatedMod._recipe.version,
      },
      {
        name: anotherPublicActivatedMod._recipe.id,
        version: anotherPublicActivatedMod._recipe.version,
      },
    ]);
  });
});

describe("fetchModUpdates function", () => {
  let activatedMods: ActivatedModComponent[];

  beforeEach(async () => {
    activatedMods = [
      persistedExtensionFactory({
        _recipe: installedRecipeMetadataFactory({
          sharing: sharingDefinitionFactory({ public: true }),
        }),
      }),
      persistedExtensionFactory({
        _recipe: installedRecipeMetadataFactory({
          sharing: sharingDefinitionFactory({ public: true }),
        }),
      }),
    ];

    await saveOptions({ extensions: activatedMods });
  });

  it("calls the registry/updates/ endpoint with the right payload", async () => {
    axiosMock.onPost().reply(200, {});

    await fetchModUpdates();

    expect(axiosMock.history.post.length).toBe(1);
    const payload = JSON.parse(String(axiosMock.history.post[0].data));

    expect(payload).toEqual({
      versions: [
        {
          name: activatedMods[0]._recipe.id,
          version: activatedMods[0]._recipe.version,
        },
        {
          name: activatedMods[1]._recipe.id,
          version: activatedMods[1]._recipe.version,
        },
      ],
    });
  });

  it("reports error and returns empty object on failure", async () => {
    axiosMock.onPost().reply(400, {});

    const result = await fetchModUpdates();

    expect(result).toEqual([]);
    expect(reportError).toHaveBeenCalled();
  });
});

describe("deactivateMod function", () => {
  let modToDeactivate: ActivatedModComponent["_recipe"];

  beforeEach(async () => {
    modToDeactivate = installedRecipeMetadataFactory({});
    const anotherMod = installedRecipeMetadataFactory({});

    await saveOptions({
      extensions: [
        persistedExtensionFactory({
          _recipe: modToDeactivate,
        }),
        persistedExtensionFactory({
          _recipe: modToDeactivate,
        }),
        persistedExtensionFactory({
          _recipe: anotherMod,
        }),
      ],
    });
  });

  it("should remove the mod components from the options state", async () => {
    const priorOptionsState = await loadOptions();
    const priorEditorState = await getEditorState();

    const {
      reduxState: { options: resultingState },
      deactivatedModComponents,
    } = deactivateMod(modToDeactivate.id, {
      options: priorOptionsState,
      editor: priorEditorState,
    });

    expect(deactivatedModComponents.length).toEqual(2);
    expect(deactivatedModComponents[0]._recipe.id).toEqual(modToDeactivate.id);
    expect(deactivatedModComponents[1]._recipe.id).toEqual(modToDeactivate.id);
    expect(resultingState.extensions.length).toEqual(1);
  });

  it("should do nothing if mod id does not have any activated mod components", async () => {
    const extensionPoint = extensionPointDefinitionFactory();
    const extension = persistedExtensionFactory({
      extensionPointId: extensionPoint.metadata.id,
      _recipe: installedRecipeMetadataFactory({}),
    });

    await saveOptions({
      extensions: [extension],
    });

    const priorOptionsState = await loadOptions();
    const priorEditorState = await getEditorState();

    const {
      reduxState: { options: resultingState },
      deactivatedModComponents,
    } = deactivateMod("@test/id-doesnt-exist" as RegistryId, {
      options: priorOptionsState,
      editor: priorEditorState,
    });

    expect(deactivatedModComponents).toEqual([]);
    expect(resultingState.extensions).toEqual(priorOptionsState.extensions);
  });
});

describe("updateModsIfUpdatesAvailable", () => {
  let publicMod: ModDefinition;
  let publicModUpdate: ModDefinition;

  beforeEach(async () => {
    axiosMock.reset();

    publicMod = versionedRecipeWithResolvedExtensions(2)({
      sharing: sharingDefinitionFactory({ public: true }),
    });

    publicModUpdate = {
      ...publicMod,
      metadata: {
        ...publicMod.metadata,
        version: "2.0.1" as SemVerString,
      },
    };

    const optionsState = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe: publicMod,
        extensionPoints: publicMod.extensionPoints,
        screen: "marketplace",
        isReinstall: false,
      })
    );

    await saveOptions(optionsState);
  });

  it("should do nothing if no feature flag", async () => {
    const priorOptionsState = await loadOptions();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(200, {
      updates: [
        {
          backwards_compatible: publicModUpdate,
          name: publicMod.metadata.id,
          backwards_incompatible: false,
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await loadOptions();

    expect(resultingOptionsState).toEqual(priorOptionsState);
    expect(axiosMock.history.get.length).toBe(1);
  });

  it("should not update if no updates available", async () => {
    const priorOptionsState = await loadOptions();

    axiosMock.onGet().reply(200, {
      flags: ["automatic-mod-updates"],
    });

    axiosMock.onPost().reply(200, {
      updates: [
        {
          backwards_compatible: null,
          name: publicMod.metadata.id,
          backwards_incompatible: false,
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await loadOptions();
    expect(resultingOptionsState).toEqual(priorOptionsState);
  });

  it("should update the mod if updates available", async () => {
    axiosMock.onGet().reply(200, {
      flags: ["automatic-mod-updates"],
    });

    axiosMock.onPost().reply(200, {
      updates: [
        {
          backwards_compatible: publicModUpdate,
          name: publicMod.metadata.id,
          backwards_incompatible: false,
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await loadOptions();
    expect(resultingOptionsState.extensions.length).toEqual(2);
    expect(resultingOptionsState.extensions[0]._recipe.version).toEqual(
      "2.0.1"
    );
    expect(resultingOptionsState.extensions[1]._recipe.version).toEqual(
      "2.0.1"
    );
  });
});
