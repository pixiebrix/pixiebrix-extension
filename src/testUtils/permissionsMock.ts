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

import { type Permissions } from "webextension-polyfill";
import { remove } from "lodash";
import * as backgroundApi from "@/background/messenger/api";

// Permissions from the manifest.json
const initialPermissions: Permissions.AnyPermissions = {
  origins: ["https://*.pixiebrix.com/*"],
  permissions: [
    "activeTab",
    "storage",
    "identity",
    "tabs",
    "webNavigation",
    "contextMenus",
  ],
};

let extensionPermissions: Permissions.AnyPermissions = initialPermissions;
const addListeners = new Set<() => void>();
const removeListeners = new Set<() => void>();

// API missing from mock https://github.com/clarkbw/jest-webextension-mock/issues/148
browser.permissions = {
  getAll: jest.fn().mockImplementation(async () => extensionPermissions),
  contains: jest.fn().mockImplementation(
    async (permissions: Permissions.AnyPermissions) =>
      (permissions.permissions ?? []).every((permission) =>
        extensionPermissions.permissions.includes(permission)
      ) &&
      // XXX: only handles exact matches
      (permissions.origins ?? []).every((origin) =>
        extensionPermissions.origins.includes(origin)
      )
  ),
  onAdded: {
    addListener: jest.fn().mockImplementation((listener) => {
      addListeners.add(listener);
    }),
    removeListener: jest.fn().mockImplementation((listener) => {
      addListeners.delete(listener);
    }),
    hasListener: jest
      .fn()
      .mockImplementation((listener) => addListeners.has(listener)),
    hasListeners: jest.fn().mockReturnValue(() => addListeners.size > 0),
  },
  onRemoved: {
    addListener: jest.fn().mockImplementation((listener) => {
      removeListeners.add(listener);
    }),
    removeListener: jest.fn().mockImplementation((listener) => {
      removeListeners.delete(listener);
    }),
    hasListener: jest
      .fn()
      .mockImplementation((listener) => removeListeners.has(listener)),
    hasListeners: jest.fn().mockImplementation(() => removeListeners.size > 0),
  },
  remove: jest
    .fn()
    .mockImplementation(async (toRemove: Permissions.AnyPermissions) => {
      remove(extensionPermissions.permissions, (permission) =>
        toRemove.permissions.includes(permission)
      );
      // XXX: only handles exact matches
      remove(extensionPermissions.origins, (permission) =>
        toRemove.origins.includes(permission)
      );

      for (const listener of removeListeners) {
        listener();
      }
    }),
  request: jest
    .fn()
    .mockImplementation(async (permissions: Permissions.AnyPermissions) => {
      permissions.permissions.push(...(permissions.permissions ?? []));
      permissions.origins.push(...(permissions.origins ?? []));

      for (const listener of addListeners) {
        listener();
      }

      return true;
    }),
};

export function resetMock(): void {
  setPermissions(initialPermissions);
}

export function setPermissions(
  newPermissions: Permissions.AnyPermissions
): void {
  extensionPermissions = newPermissions;
}

// Mock these until we can get a fake/mock registry working for tests
jest
  .mocked(backgroundApi.containsPermissions)
  .mockImplementation(browser.permissions.contains);

jest.mock("@/recipes/recipePermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/recipes/recipePermissionsHelpers"
  );
  return {
    ...originalModule,
    checkRecipePermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/extensionPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/extensionPermissionsHelpers"
  );
  return {
    ...originalModule,
    collectExtensionPermissions: jest.fn().mockImplementation(async () => ({
      origins: [],
    })),
    checkExtensionPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/cloudExtensionPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/cloudExtensionPermissionsHelpers"
  );
  return {
    ...originalModule,
    checkCloudExtensionPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/deploymentPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/deploymentPermissionsHelpers"
  );
  return {
    ...originalModule,
    checkDeploymentPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/servicePermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/deploymentPermissionsHelpers"
  );
  return {
    ...originalModule,
    collectServiceOriginPermissions: jest.fn().mockImplementation(async () => ({
      origins: [],
    })),
  };
});
