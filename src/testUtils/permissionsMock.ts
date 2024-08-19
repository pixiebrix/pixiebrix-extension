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

import { type Permissions } from "webextension-polyfill";
import { remove } from "lodash";

// Permissions from the manifest.json
const initialPermissions = {
  origins: ["https://*.pixiebrix.com/*"],
  permissions: [
    "activeTab",
    "storage",
    "identity",
    "tabs",
    "webNavigation",
    "contextMenus",
  ],
} satisfies Permissions.AnyPermissions;

let extensionPermissions = structuredClone(initialPermissions);
const addListeners = new Set<() => void>();
const removeListeners = new Set<() => void>();

// API missing from mock https://github.com/clarkbw/jest-webextension-mock/issues/148
browser.permissions = {
  getAll: jest.fn().mockImplementation(async () => extensionPermissions),
  contains: jest.fn().mockImplementation(
    async (permissions: Permissions.AnyPermissions) =>
      (permissions.permissions ?? []).every((permission) =>
        extensionPermissions.permissions.includes(permission),
      ) &&
      // XXX: only handles exact matches
      (permissions.origins ?? []).every((origin) =>
        extensionPermissions.origins.includes(origin),
      ),
  ),
  onAdded: {
    addListener: jest.fn().mockImplementation((listener: () => void) => {
      addListeners.add(listener);
    }),
    removeListener: jest.fn().mockImplementation((listener: () => void) => {
      addListeners.delete(listener);
    }),
    hasListener: jest
      .fn()
      .mockImplementation((listener: () => void) => addListeners.has(listener)),
  },
  onRemoved: {
    addListener: jest.fn().mockImplementation((listener: () => void) => {
      removeListeners.add(listener);
    }),
    removeListener: jest.fn().mockImplementation((listener: () => void) => {
      removeListeners.delete(listener);
    }),
    hasListener: jest
      .fn()
      .mockImplementation((listener: () => void) =>
        removeListeners.has(listener),
      ),
  },
  remove: jest
    .fn()
    .mockImplementation(async (toRemove: Permissions.AnyPermissions) => {
      remove(
        extensionPermissions.permissions,
        (permission) => toRemove.permissions?.includes(permission),
      );
      // XXX: only handles exact matches
      remove(
        extensionPermissions.origins,
        (permission) => toRemove.origins?.includes(permission),
      );

      for (const listener of removeListeners) {
        listener();
      }
    }),
  request: jest
    .fn()
    .mockImplementation(async (permissions: Permissions.AnyPermissions) => {
      extensionPermissions.permissions.push(...(permissions.permissions ?? []));
      extensionPermissions.origins.push(...(permissions.origins ?? []));

      for (const listener of addListeners) {
        listener();
      }

      return true;
    }),
};

export function setPermissions(
  newPermissions: Permissions.AnyPermissions,
): void {
  extensionPermissions = { origins: [], permissions: [], ...newPermissions };
}

jest.mock("@/modDefinitions/modDefinitionPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/modDefinitions/modDefinitionPermissionsHelpers",
  );
  return {
    ...originalModule,
    checkModDefinitionPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/modComponentPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/modComponentPermissionsHelpers",
  );
  return {
    ...originalModule,
    collectModComponentPermissions: jest.fn().mockImplementation(async () => ({
      origins: [],
    })),
    checkExtensionPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/permissions/deploymentPermissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/deploymentPermissionsHelpers",
  );
  return {
    ...originalModule,
    checkDeploymentPermissions: jest.fn().mockImplementation(async () => ({
      hasPermissions: true,
      permissions: { origins: [] },
    })),
  };
});

jest.mock("@/integrations/util/permissionsHelpers", () => {
  const originalModule = jest.requireActual(
    "@/permissions/deploymentPermissionsHelpers",
  );
  return {
    ...originalModule,
    collectIntegrationOriginPermissions: jest
      .fn()
      .mockImplementation(async () => ({
        origins: [],
      })),
  };
});
