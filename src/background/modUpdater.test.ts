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
  fetchModUpdates,
  getActivatedMarketplaceModVersions,
  updateMod,
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
import type { SemVerString } from "@/types/registryTypes";
import {
  modDefinitionWithVersionedStarterBrickFactory,
  defaultModDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { getEditorState } from "@/store/editorStorage";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import {
  personalSharingDefinitionFactory,
  publicSharingDefinitionFactory,
} from "@/testUtils/factories/registryFactories";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import { uninstallContextMenu } from "@/background/contextMenus/uninstallContextMenu";
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";
import {
  personalDeploymentMetadataFactory,
  teamDeploymentMetadataFactory,
} from "@/testUtils/factories/modInstanceFactories";

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
    await saveModComponentState({ activatedModComponents: [] });

    publicActivatedMod = activatedModComponentFactory({
      modMetadata: modMetadataFactory({
        sharing: publicSharingDefinitionFactory(),
      }),
    });

    privateActivatedMod = activatedModComponentFactory({
      modMetadata: modMetadataFactory({
        sharing: personalSharingDefinitionFactory(),
      }),
    });

    publicActivatedDeployment = activatedModComponentFactory({
      modMetadata: modMetadataFactory({
        sharing: publicSharingDefinitionFactory(),
      }),
      deploymentMetadata: teamDeploymentMetadataFactory(),
    });

    privateActivatedDeployment = activatedModComponentFactory({
      modMetadata: modMetadataFactory({
        sharing: personalSharingDefinitionFactory(),
      }),
      deploymentMetadata: personalDeploymentMetadataFactory(),
    });
  });

  it("should return empty list if no activated mods", async () => {
    const result = await getActivatedMarketplaceModVersions();
    expect(result).toEqual([]);
  });

  it("should only return public mods without deployments", async () => {
    await saveModComponentState({
      activatedModComponents: [
        publicActivatedMod,
        privateActivatedMod,
        publicActivatedDeployment,
        privateActivatedDeployment,
      ],
    });

    const result = await getActivatedMarketplaceModVersions();
    expect(result).toEqual([
      {
        name: publicActivatedMod.modMetadata.id,
        version: publicActivatedMod.modMetadata.version,
      },
    ]);
  });

  it("returns expected object with registry id keys and version number values", async () => {
    const anotherPublicActivatedMod = activatedModComponentFactory({
      modMetadata: modMetadataFactory({
        sharing: publicSharingDefinitionFactory(),
      }),
    });

    await saveModComponentState({
      activatedModComponents: [publicActivatedMod, anotherPublicActivatedMod],
    });

    const result = await getActivatedMarketplaceModVersions();

    expect(result).toEqual([
      {
        name: publicActivatedMod.modMetadata.id,
        version: publicActivatedMod.modMetadata.version,
      },
      {
        name: anotherPublicActivatedMod.modMetadata.id,
        version: anotherPublicActivatedMod.modMetadata.version,
      },
    ]);
  });
});

describe("fetchModUpdates function", () => {
  let activatedMods: ActivatedModComponent[];

  beforeEach(async () => {
    activatedMods = [
      activatedModComponentFactory({
        modMetadata: modMetadataFactory({
          sharing: publicSharingDefinitionFactory(),
        }),
      }),
      activatedModComponentFactory({
        modMetadata: modMetadataFactory({
          sharing: publicSharingDefinitionFactory(),
        }),
      }),
    ];

    await saveModComponentState({ activatedModComponents: activatedMods });
  });

  it("calls the registry/updates/ endpoint with the right payload", async () => {
    axiosMock.onPost().reply(200, { updates: [] });

    await fetchModUpdates();

    expect(axiosMock.history.post).toHaveLength(1);
    const payload = JSON.parse(String(axiosMock.history.post![0]!.data));

    expect(payload).toEqual({
      versions: [
        {
          name: activatedMods[0]!.modMetadata.id,
          version: activatedMods[0]!.modMetadata.version,
        },
        {
          name: activatedMods[1]!.modMetadata.id,
          version: activatedMods[1]!.modMetadata.version,
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

describe("updateMod function", () => {
  const modToUpdate = defaultModDefinitionFactory();
  let modComponentToDeactivate1: ActivatedModComponent;
  let modComponentToDeactivate2: ActivatedModComponent;

  beforeEach(async () => {
    const modToDeactivate = modMetadataFactory(modToUpdate.metadata);
    modComponentToDeactivate1 = activatedModComponentFactory({
      modMetadata: modToDeactivate,
    });
    modComponentToDeactivate2 = activatedModComponentFactory({
      modMetadata: modToDeactivate,
    });
    const anotherMod = modMetadataFactory({});

    await saveModComponentState({
      activatedModComponents: [
        modComponentToDeactivate1,
        modComponentToDeactivate2,
        activatedModComponentFactory({
          modMetadata: anotherMod,
        }),
      ],
    });
  });

  it("should uninstall the context menus", async () => {
    const priorOptionsState = await getModComponentState();
    const priorEditorState = await getEditorState();

    updateMod(modToUpdate, {
      options: priorOptionsState,
      editor: priorEditorState,
    });

    // Verify that deactivate removes the context menu UI globally. See call for explanation of why that's necessary.
    expect(uninstallContextMenuMock).toHaveBeenCalledTimes(2);
    expect(uninstallContextMenuMock).toHaveBeenCalledWith({
      modComponentId: modComponentToDeactivate1.id,
    });
    expect(uninstallContextMenuMock).toHaveBeenCalledWith({
      modComponentId: modComponentToDeactivate2.id,
    });
  });
});

describe("updateModsIfUpdatesAvailable", () => {
  let publicMod: ModDefinition;
  let publicModUpdate: ModDefinition;

  beforeEach(async () => {
    axiosMock.reset();

    publicMod = modDefinitionWithVersionedStarterBrickFactory()({
      sharing: publicSharingDefinitionFactory(),
    });

    publicModUpdate = {
      ...publicMod,
      metadata: {
        ...publicMod.metadata,
        version: "2.0.1" as SemVerString,
      },
    };

    const optionsState = modComponentSlice.reducer(
      { activatedModComponents: [] },
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
    expect(resultingOptionsState.activatedModComponents).toHaveLength(1);
    expect(
      resultingOptionsState.activatedModComponents[0]!.modMetadata.version,
    ).toBe("2.0.1");
  });
});
