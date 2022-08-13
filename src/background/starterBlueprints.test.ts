/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { installStarterBlueprints } from "@/background/starterBlueprints";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { isLinked } from "@/auth/token";
import { extensionFactory, recipeFactory } from "@/testUtils/factories";
import { PersistedExtension } from "@/core";

const axiosMock = new MockAdapter(axios);

jest.mock("@/auth/token", () => ({
  getExtensionToken: async () => "TESTTOKEN",
  isLinked: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/background/util", () => ({
  forEachTab: jest.fn().mockResolvedValue(undefined),
}));

const isLinkedMock = isLinked as jest.Mock;
const openPlaygroundPage = browser.tabs.create as jest.Mock;

beforeEach(async () => {
  jest.resetModules();

  // Reset local options state
  await saveOptions({
    extensions: [],
  });

  isLinkedMock.mockClear();
  openPlaygroundPage.mockClear();
});

describe("installStarterBlueprints", () => {
  test("user has starter blueprints available to install", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet().reply(200, [recipeFactory()]);
    axiosMock.onPost().reply(204);

    await installStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    expect(openPlaygroundPage.mock.calls).toHaveLength(1);
  });

  test("user does not have starter blueprints available to install", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet().reply(200, []);
    axiosMock.onPost().reply(204);

    await installStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
    expect(openPlaygroundPage.mock.calls).toHaveLength(0);
  });

  test("starter blueprints request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet().reply(500);
    axiosMock.onPost().reply(204);

    await installStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
    expect(openPlaygroundPage.mock.calls).toHaveLength(0);
  });

  test("starter blueprints installation request fails", async () => {
    isLinkedMock.mockResolvedValue(true);

    axiosMock.onGet().reply(200, []);
    axiosMock.onPost().reply(500);

    await installStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(0);
    expect(openPlaygroundPage.mock.calls).toHaveLength(0);
  });

  test("starter blueprint already installed", async () => {
    isLinkedMock.mockResolvedValue(true);

    const extension = extensionFactory() as PersistedExtension;
    await saveOptions({
      extensions: [extension],
    });

    axiosMock.onGet().reply(200, [
      {
        updated_at: "",
        extensionPoints: [extension],
        sharing: {},
      },
    ]);

    axiosMock.onPost().reply(204);

    await installStarterBlueprints();
    const { extensions } = await loadOptions();

    expect(extensions.length).toBe(1);
    expect(openPlaygroundPage.mock.calls).toHaveLength(0);
  });
});
