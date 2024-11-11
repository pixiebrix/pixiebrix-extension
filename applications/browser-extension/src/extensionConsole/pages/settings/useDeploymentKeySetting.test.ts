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

import { deploymentKeyStorage } from "@/auth/deploymentKey";
import { renderHook } from "@/extensionConsole/testHelpers";
import useDeploymentKeySetting from "@/extensionConsole/pages/settings/useDeploymentKeySetting";
import { deploymentKeyFactory } from "@/testUtils/factories/authFactories";
import { act } from "@testing-library/react";
import { waitForNextUpdate } from "@/testUtils/renderHookHelpers";

describe("useDeploymentKeySettings", () => {
  beforeEach(async () => {
    await deploymentKeyStorage.remove();
  });

  it("sets deployment key", async () => {
    const target = deploymentKeyFactory();

    const { result } = renderHook(() => useDeploymentKeySetting());

    const [value, setValue] = result.current;
    expect(value).toBeUndefined();

    await act(async () => {
      await setValue(target);
    });

    await expect(deploymentKeyStorage.get()).resolves.toBe(target);
  });

  it("unsets deployment key", async () => {
    const original = deploymentKeyFactory();

    await deploymentKeyStorage.set(original);

    const { result } = renderHook(() => useDeploymentKeySetting());

    // Wait for the async value to load in the hook
    await waitForNextUpdate(result);

    const [value, setValue] = result.current;
    expect(value).toBe(original);

    await act(async () => {
      await setValue("");
    });

    await expect(deploymentKeyStorage.get()).resolves.toBeUndefined();
  });

  it("rejects invalid deployment key", async () => {
    const { result } = renderHook(() => useDeploymentKeySetting());

    const [_value, setValue] = result.current;

    await act(async () => {
      await setValue("InValID!");
    });

    await expect(deploymentKeyStorage.get()).resolves.toBeUndefined();
  });
});
