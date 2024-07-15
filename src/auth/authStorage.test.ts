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

import { getAuthHeaders, TEST_setAuthData } from "@/auth/authStorage";
import { deploymentKeyStorage } from "@/auth/deploymentKey";
import {
  deploymentKeyFactory,
  userTokenFactory,
} from "@/testUtils/factories/authFactories";

describe("getAuthHeaders", () => {
  beforeEach(async () => {
    await deploymentKeyStorage.remove();
    await TEST_setAuthData(null);
  });

  it("returns null for unauthenticated", async () => {
    await expect(getAuthHeaders()).resolves.toBeNull();
  });

  it("includes X-Device-Id header with deployment key", async () => {
    const deploymentKey = deploymentKeyFactory();
    await deploymentKeyStorage.set(deploymentKey);
    await expect(getAuthHeaders()).resolves.toStrictEqual({
      Authorization: `Token ${deploymentKey}`,
      "X-Device-Id": expect.toBeString(),
    });
  });

  it("prefers user token to deployment key", async () => {
    const userToken = userTokenFactory();
    const deploymentKey = deploymentKeyFactory();
    await TEST_setAuthData({
      token: userToken,
    });
    await deploymentKeyStorage.set(deploymentKey);
    await expect(getAuthHeaders()).resolves.toStrictEqual({
      Authorization: `Token ${userToken}`,
    });
  });
});
