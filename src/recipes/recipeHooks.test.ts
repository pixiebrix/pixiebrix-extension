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

import { renderHook } from "@/extensionConsole/testHelpers";
import { useRecipe, useRequiredRecipe } from "@/recipes/recipesHooks";
import { validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";
import { registry } from "@/background/messenger/api";

registry.syncRemote = jest.fn();

describe("useRequiredRecipe", () => {
  it("only errors if recipe not found after remote fetch", async () => {
    const deferred = pDefer();
    (registry.syncRemote as jest.Mock).mockImplementation(
      async () => deferred.promise
    );

    const wrapper = renderHook(() =>
      useRequiredRecipe(validateRegistryId("nonexistent-recipe"))
    );

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
      })
    );

    deferred.resolve([]);
    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        error: expect.toBeObject(),
      })
    );
  });
});

describe("useRecipe", () => {
  it("returns null if not found", async () => {
    const deferred = pDefer();
    (registry.syncRemote as jest.Mock).mockImplementation(
      async () => deferred.promise
    );

    const wrapper = renderHook(() =>
      useRecipe(validateRegistryId("nonexistent-recipe"))
    );

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: false,
        isSuccess: true,
      })
    );

    deferred.resolve([]);
    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: false,
        isSuccess: true,
      })
    );
  });
});
