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

import { updateDeployments } from "@/background/deployment";

jest.mock("@/contentScript/messenger/api");

jest.mock("@/background/telemetry", () => ({
  getUID: async () => "UID",
}));

jest.mock("@/auth/token", () => ({
  getExtensionToken: async () => "TESTTOKEN",
  readAuthData: async () => ({
    organizationId: "00000000-00000000-00000000-00000000",
  }),
  isLinked: async () => true,
}));
import { isLinked, readAuthData } from "@/auth/token";

jest.mock("webext-detect-page", () => ({
  isBackground: () => true,
  isDevToolsPage: () => false,
  isExtensionContext: () => false,
}));

jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    runtime: {
      getManifest: () => ({
        version: "1.5.2",
      }),
    },
  },
}));

afterEach(() => {
  (isLinked as any).mockClear();
  (readAuthData as any).mockClear();
});

describe("updateDeployments", () => {
  test("can update deployments", async () => {
    (isLinked as any).mockResolvedValue(async () => true);

    await updateDeployments();
  });

  test("skip if not linked", async () => {
    (isLinked as any).mockResolvedValue(async () => false);
    (readAuthData as any).mockResolvedValue(
      async () => ({ organizationId: null } as any)
    );

    await updateDeployments();
  });

  test("can uninstall all deployments", async () => {
    (isLinked as any).mockResolvedValue(async () => true);

    await updateDeployments();
  });
});
