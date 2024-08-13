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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import {
  deactivateMod,
  fetchModUpdates,
  getActivatedMarketplaceModVersions,
  updateModsIfForceUpdatesAvailable,
} from "@/background/modUpdater";
import reportError from "@/telemetry/reportError";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
import {
  modMetadataFactory,
  activatedModComponentFactory,
} from "@/testUtils/factories/modComponentFactories";
import type { RegistryId, SemVerString } from "@/types/registryTypes";
import {
  starterBrickDefinitionFactory,
  modDefinitionWithVersionedStarterBrickFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { getEditorState } from "@/store/editorStorage";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import { uninstallContextMenu } from "@/background/contextMenus/uninstallContextMenu";
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";

const axiosMock = new MockAdapter(axios);
jest.mock("@/telemetry/reportError");
jest.mock("@/contentScript/messenger/api");
jest.mock("@/background/contextMenus/uninstallContextMenu");

const uninstallContextMenuMock = jest.mocked(uninstallContextMenu);

afterEach(async () => {
  await TEST_deleteFeatureFlagsCache();
});

describe("getActivatedMarketplaceModVersions function", () => {
  let publicActivatedMod: ActivatedModComponent;
  let privateActivatedMod: ActivatedModComponent;
  let publicActivatedDeployment: ActivatedModComponent;
  let privateActivatedDeployment: ActivatedModComponent;

  beforeEach(async () => {
    await saveModComponentState({ extensions: [] });

    publicActivatedMod = activatedModComponentFactory({
      _recipe: modMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
    });

    privateActivatedMod = activatedModComponentFactory({
      _recipe: modMetadataFactory({
        sharing: sharingDefinitionFactory({ public: false }),
      }),
    });

    publicActivatedDeployment = activatedModComponentFactory({
      _recipe: modMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
      _deployment: {} as ActivatedModComponent["_deployment"],
    });

    privateActivatedDeployment = activatedModComponentFactory({
      _recipe: modMetadataFactory({
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
    await saveModComponentState({
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
    const anotherPublicActivatedMod = activatedModComponentFactory({
      _recipe: modMetadataFactory({
        sharing: sharingDefinitionFactory({ public: true }),
      }),
    });

    await saveModComponentState({
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

  it("reports error if multiple mod component versions activated for same mod", async () => {
    const sameMod = modMetadataFactory({
      sharing: sharingDefinitionFactory({ public: true }),
    });

    const onePublicActivatedMod = activatedModComponentFactory({
      _recipe: sameMod,
    });

    const sameModDifferentVersion = modMetadataFactory({
      ...sameMod,
      version: "2.0.0" as SemVerString,
    });

    const anotherPublicActivatedMod = activatedModComponentFactory({
      _recipe: sameModDifferentVersion,
    });

    await saveModComponentState({
      extensions: [onePublicActivatedMod, anotherPublicActivatedMod],
    });

    const result = await getActivatedMarketplaceModVersions();

    expect(result).toEqual([
      {
        name: onePublicActivatedMod._recipe.id,
        version: onePublicActivatedMod._recipe.version,
      },
    ]);
    expect(reportError).toHaveBeenCalled();
  });
});

describe("fetchModUpdates function", () => {
  let activatedMods: ActivatedModComponent[];

  beforeEach(async () => {
    activatedMods = [
      activatedModComponentFactory({
        _recipe: modMetadataFactory({
          sharing: sharingDefinitionFactory({ public: true }),
        }),
      }),
      activatedModComponentFactory({
        _recipe: modMetadataFactory({
          sharing: sharingDefinitionFactory({ public: true }),
        }),
      }),
    ];

    await saveModComponentState({ extensions: activatedMods });
  });

  it("calls the registry/updates/ endpoint with the right payload", async () => {
    axiosMock.onPost().reply(200, { updates: [] });

    await fetchModUpdates();

    expect(axiosMock.history.post).toHaveLength(1);
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
    modToDeactivate = modMetadataFactory({});
    const anotherMod = modMetadataFactory({});

    await saveModComponentState({
      extensions: [
        activatedModComponentFactory({
          _recipe: modToDeactivate,
        }),
        activatedModComponentFactory({
          _recipe: modToDeactivate,
        }),
        activatedModComponentFactory({
          _recipe: anotherMod,
        }),
      ],
    });
  });

  it("should remove the mod components from the options state", async () => {
    const priorOptionsState = await getModComponentState();
    const priorEditorState = await getEditorState();

    const {
      reduxState: { options: resultingState },
      deactivatedModComponents,
    } = deactivateMod(modToDeactivate.id, {
      options: priorOptionsState,
      editor: priorEditorState,
    });

    expect(deactivatedModComponents).toHaveLength(2);
    expect(deactivatedModComponents[0]._recipe.id).toEqual(modToDeactivate.id);
    expect(deactivatedModComponents[1]._recipe.id).toEqual(modToDeactivate.id);
    expect(resultingState.extensions).toHaveLength(1);

    // Verify that deactivate removes the context menu UI globally. See call for explanation of why that's necessary.
    expect(uninstallContextMenuMock).toHaveBeenCalledTimes(2);
    expect(uninstallContextMenuMock).toHaveBeenCalledWith({
      extensionId: deactivatedModComponents[0].id,
    });
    expect(uninstallContextMenuMock).toHaveBeenCalledWith({
      extensionId: deactivatedModComponents[1].id,
    });
  });

  it("should do nothing if mod id does not have any activated mod components", async () => {
    const extensionPoint = starterBrickDefinitionFactory();
    const extension = activatedModComponentFactory({
      extensionPointId: extensionPoint.metadata.id,
      _recipe: modMetadataFactory({}),
    });

    await saveModComponentState({
      extensions: [extension],
    });

    const priorOptionsState = await getModComponentState();
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

    publicMod = modDefinitionWithVersionedStarterBrickFactory()({
      sharing: sharingDefinitionFactory({ public: true }),
    });

    publicModUpdate = {
      ...publicMod,
      metadata: {
        ...publicMod.metadata,
        version: "2.0.1" as SemVerString,
      },
    };

    const optionsState = modComponentSlice.reducer(
      { extensions: [] },
      modComponentSlice.actions.activateMod({
        modDefinition: publicMod,
        screen: "marketplace",
        isReactivate: false,
      }),
    );

    await saveModComponentState(optionsState);
  });

  it("should do nothing if no feature flag", async () => {
    const priorOptionsState = await getModComponentState();

    axiosMock.onGet().reply(200, {
      flags: [],
    });

    axiosMock.onPost().reply(200, {
      updates: [
        {
          backwards_compatible: publicModUpdate,
          name: publicMod.metadata.id,
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await getModComponentState();

    expect(resultingOptionsState).toEqual(priorOptionsState);
    expect(axiosMock.history.get).toHaveLength(1);
  });

  it("should not update if no updates available", async () => {
    const priorOptionsState = await getModComponentState();

    axiosMock.onGet().reply(200, {
      flags: ["automatic-mod-updates"],
    });

    axiosMock.onPost().reply(200, {
      updates: [
        {
          backwards_compatible: null,
          name: publicMod.metadata.id,
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await getModComponentState();
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
        },
      ],
    });

    await updateModsIfForceUpdatesAvailable();

    const resultingOptionsState = await getModComponentState();
    expect(resultingOptionsState.extensions).toHaveLength(1);
    expect(resultingOptionsState.extensions[0]._recipe.version).toBe("2.0.1");
  });
});
