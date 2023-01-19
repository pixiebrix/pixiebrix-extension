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

import { useEffect, useState } from "react";
import {
  dropOverlappingPermissions,
  selectAdditionalPermissionsSync,
} from "webext-additional-permissions";

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

/** Returns a sorted array of all the permission with details, auto-updating */
export default function useExtensionPermissions(): DetailedPermissions {
  const [permissions, setPermissions] = useState<DetailedPermissions>([]);

  const update = async () => {
    setPermissions(await getDetailedPermissions());
  };

  useEffect(() => {
    void update();
    browser.permissions.onAdded.addListener(update);
    browser.permissions.onRemoved.addListener(update);
    return () => {
      browser.permissions.onAdded.removeListener(update);
      browser.permissions.onRemoved.removeListener(update);
    };
  }, []);

  return permissions;
}
