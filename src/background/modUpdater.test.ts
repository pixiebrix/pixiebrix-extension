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
  getActivatedMarketplaceMods,
} from "@/background/modUpdater";
import reportError from "@/telemetry/reportError";
import { loadOptions } from "@/store/extensionsStorage";
import { persistedExtensionFactory } from "@/testUtils/factories/extensionFactories";
import { Sharing } from "@/types/registryTypes";
import { ModDefinition } from "@/types/modDefinitionTypes";
import { IExtension, PersistedExtension } from "@/types/extensionTypes";
import { Deployment } from "@/types/contract";

const axiosMock = new MockAdapter(axios);
jest.mock("@/telemetry/reportError", () => jest.fn());
jest.mock("@/store/extensionsStorage", () => ({
  loadOptions: jest.fn(),
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

describe("getActivatedMarketplaceMods function", () => {
  let publicActivatedMod: PersistedExtension;
  let privateActivatedMod: PersistedExtension;
  let publicActivatedDeployment: PersistedExtension;
  let privateActivatedDeployment: PersistedExtension;

  beforeEach(() => {
    (loadOptions as jest.Mock).mockReturnValue({
      extensions: [],
    });

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
    const result = await getActivatedMarketplaceMods();
    expect(result).toEqual([]);
  });

  it("should only return public mods without deployments", async () => {
    (loadOptions as jest.Mock).mockReturnValue({
      extensions: [
        publicActivatedMod,
        privateActivatedMod,
        publicActivatedDeployment,
        privateActivatedDeployment,
      ],
    });

    const result = await getActivatedMarketplaceMods();
    expect(result).toEqual([publicActivatedMod]);
  });
});
