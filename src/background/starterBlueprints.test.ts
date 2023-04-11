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

import { debouncedInstallStarterBlueprints } from "@/background/starterBlueprints";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/token";
import { extensionFactory, recipeFactory } from "@/testUtils/factories";
import { refreshRegistries } from "./refreshRegistries";
import {
  type IExtension,
  type PersistedExtension,
} from "@/types/extensionTypes";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/token", () => ({
  async getAuthHeaders() {
    return {};
  },
  isLinked: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/background/activeTab", () => ({
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./refreshRegistries", () => ({
  refreshRegistries: jest.fn().mockResolvedValue(undefined),
}));

const isLinkedMock = isLinked as jest.Mock;
jest.useFakeTimers();

beforeEach(async () => {
  jest.resetModules();
  jest.runAllTimers();

  // Reset local options state
  await saveOptions({
    extensions: [],
  });

  jest.clearAllMocks();
});

describe("installStarterBlueprints", () => {
  test("user has starter blueprints available to install", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    expect((refreshRegistries as jest.Mock).mock.calls).toHaveLength(1);
  });

  test("starter blueprints request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });
    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(500);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
  });

  test("starter blueprints installation request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(500);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
  });

  test("starter blueprint already installed", async () => {
    isLinkedMock.mockResolvedValue(true);

    const recipe = recipeFactory();

    const extension = extensionFactory({
      _recipe: { id: recipe.metadata.id } as IExtension["_recipe"],
    }) as PersistedExtension;
    await saveOptions({
      extensions: [extension],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });

    axiosMock.onGet("/api/onboarding/starter-blueprints/").reply(200, [
      {
        extensionPoints: [extension],
        ...recipe,
      },
    ]);

    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
  });

  test("extension with no _recipe doesn't throw undefined error", async () => {
    isLinkedMock.mockResolvedValue(true);

    const extension = extensionFactory({
      _recipe: undefined,
    }) as PersistedExtension;
    await saveOptions({
      extensions: [extension],
    });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/install/")
      .reply(200, { install_starter_blueprints: true });

    axiosMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(200, [recipeFactory()]);
    axiosMock.onPost("/api/onboarding/starter-blueprints/install/").reply(204);

    await debouncedInstallStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(2);
  });
});
