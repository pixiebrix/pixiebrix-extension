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

import {
  dropOverlappingPermissions,
  selectAdditionalPermissionsSync,
} from "webext-additional-permissions";
import { type AsyncState } from "@/types/sliceTypes";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";

type DetailedPermissions = Array<{
  name: string;
  isOrigin: boolean;
  isAdditional: boolean;
  isUnique: boolean;
}>;

async function getDetailedPermissions() {
  const all = await browser.permissions.getAll();
  const unique = dropOverlappingPermissions(all);
  const additional = selectAdditionalPermissionsSync(all);

  return [
    ...all.permissions.sort().map((permission) => ({
      name: permission,
      isOrigin: false,
      isUnique: unique.permissions.includes(permission),
      isAdditional: additional.permissions.includes(permission),
    })),
    ...all.origins.sort().map((origin) => ({
      name: origin,
      isOrigin: true,
      isUnique: unique.origins.includes(origin),
      isAdditional: additional.origins.includes(origin),
    })),
  ];
}

function subscribe(callback: () => void) {
  browser.permissions.onAdded.addListener(callback);
  browser.permissions.onRemoved.addListener(callback);

  return () => {
    browser.permissions.onAdded.removeListener(callback);
    browser.permissions.onRemoved.removeListener(callback);
  };
}

/** Returns a sorted array of all the permission with details. Subscribes to browser permissions updates. */
export default function useExtensionPermissions(): AsyncState<DetailedPermissions> {
  return useAsyncExternalStore(subscribe, getDetailedPermissions);
}
