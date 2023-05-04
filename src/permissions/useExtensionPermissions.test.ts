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

import { renderHook, act } from "@testing-library/react-hooks";
import useExtensionPermissions from "./useExtensionPermissions";
import { selectAdditionalPermissionsSync } from "webext-additional-permissions";
import {
  uninitializedAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import { setPermissions } from "@/testUtils/permissionsMock";
import { INTERNAL_reset } from "@/hooks/useAsyncExternalStore";

const selectAdditionalMock = jest.mocked(selectAdditionalPermissionsSync);

jest.mock("webext-additional-permissions", () => ({
  ...jest.requireActual("webext-additional-permissions"),
  selectAdditionalPermissionsSync: jest.fn(),
}));

const manifestPermission = "https://p.com/*";

function mockOrigins(...additional: string[]): void {
  setPermissions({
    permissions: [],
    origins: [manifestPermission, ...additional],
  });
  selectAdditionalMock.mockReturnValue({
    permissions: [],
    origins: additional,
  });
}

describe("useExtensionPermissions", () => {
  beforeEach(() => {
    // eslint-disable-next-line new-cap -- test helper method
    INTERNAL_reset();
  });

  test("reads manifest", async () => {
    mockOrigins();
    const { result } = renderHook(useExtensionPermissions);
    expect(result.current).toEqual(uninitializedAsyncStateFactory());
    await act(async () => {});
    expect(result.current).toEqual(
      valueToAsyncState([
        {
          isAdditional: false,
          isOrigin: true,
          isUnique: true,
          name: "https://p.com/*",
        },
      ])
    );
  });

  test("includes additional permissions", async () => {
    mockOrigins("https://added.example.com/*", "https://more.example.com/*");
    const { result } = renderHook(useExtensionPermissions);
    await act(async () => {});
    expect(result.current).toEqual(
      valueToAsyncState([
        {
          isAdditional: true,
          isOrigin: true,
          isUnique: true,
          name: "https://added.example.com/*",
        },
        {
          isAdditional: true,
          isOrigin: true,
          isUnique: true,
          name: "https://more.example.com/*",
        },
        {
          isAdditional: false,
          isOrigin: true,
          isUnique: true,
          name: "https://p.com/*",
        },
      ])
    );
  });

  test("detects overlapping permissions", async () => {
    mockOrigins("https://added.example.com/*", "https://*.example.com/*");
    const { result } = renderHook(useExtensionPermissions);
    await act(async () => {});
    expect(result.current).toEqual(
      valueToAsyncState([
        {
          isAdditional: true,
          isOrigin: true,
          isUnique: true,
          name: "https://*.example.com/*",
        },
        {
          isAdditional: true,
          isOrigin: true,
          isUnique: false,
          name: "https://added.example.com/*",
        },
        {
          isAdditional: false,
          isOrigin: true,
          isUnique: true,
          name: "https://p.com/*",
        },
      ])
    );
  });
});
