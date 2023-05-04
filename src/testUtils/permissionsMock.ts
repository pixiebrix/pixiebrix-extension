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

let permissions: Permissions.AnyPermissions = initialPermissions;
const addListeners = new Set<() => void>();
const removeListeners = new Set<() => void>();

// API missing from mock https://github.com/clarkbw/jest-webextension-mock/issues/148
browser.permissions = {
  getAll: jest.fn().mockResolvedValue(permissions),
  contains: jest
    .fn()
    .mockImplementation(async (permissions: Permissions.AnyPermissions) => {
      return (
        (permissions.permissions ?? []).every((permission) =>
          permissions.permissions.includes(permission)
        ) &&
        // XXX: only handles exact matches
        (permissions.origins ?? []).every((origin) =>
          permissions.origins.includes(origin)
        )
      );
    }),
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
      remove(permissions.permissions, (permission) =>
        toRemove.permissions.includes(permission)
      );
      // XXX: only handles exact matches
      remove(permissions.origins, (permission) =>
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

export function resetMock() {
  permissions = initialPermissions;
}
