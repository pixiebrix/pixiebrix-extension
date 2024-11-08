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

import { renderHook } from "../extensionConsole/testHelpers";
import {
  useOptionalModDefinition,
  useRequiredModDefinitions,
} from "./modDefinitionHooks";
import { validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";
import { registry } from "../background/messenger/api";

registry.syncRemote = jest.fn();

describe("useRequiredModDefinitions", () => {
  it("only errors if mod definition not found after remote fetch", async () => {
    const deferred = pDefer<void>();
    jest
      .mocked(registry.syncRemote)
      .mockImplementation(async () => deferred.promise);

    const wrapper = renderHook(() =>
      useRequiredModDefinitions([
        validateRegistryId("nonexistent-mod-definition"),
      ]),
    );

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
      }),
    );

    deferred.resolve([] as any);
    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        error: expect.toBeObject(),
      }),
    );
  });
});

describe("useOptionalModDefinition", () => {
  it("returns null if not found", async () => {
    const deferred = pDefer<void>();
    jest
      .mocked(registry.syncRemote)
      .mockImplementation(async () => deferred.promise);

    const wrapper = renderHook(() =>
      useOptionalModDefinition(
        validateRegistryId("nonexistent-mod-definition"),
      ),
    );

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: false,
        isSuccess: true,
      }),
    );

    deferred.resolve([] as any);
    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual(
      expect.objectContaining({
        data: undefined,
        isLoading: false,
        isSuccess: true,
      }),
    );
  });
});
