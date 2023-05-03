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

import { type IExtension } from "@/types/extensionTypes";
import { type Permissions } from "webextension-polyfill";
import { resolveDefinitions } from "@/registry/internal";
import extensionPointRegistry from "@/extensionPoints/registry";
import { compact } from "lodash";
import { mergePermissions } from "@/permissions/permissionsUtils";
import { type IExtensionPoint } from "@/types/extensionPointTypes";
import { serviceOriginPermissions } from "@/permissions/servicePermissionsHelpers";

type PermissionOptions = {
  /**
   * If provided, used instead of the registry version of the referenced extensionPoint.
   */
  extensionPoint?: IExtensionPoint;

  /**
   * True to include permissions for permissions declared on the extension point and it's default reader.
   */
  includeExtensionPoint?: boolean;

  /**
   * True to include permissions for services referenced by the extension.
   */
  includeServices?: boolean;
};

/**
 * Returns browser permissions required to run the IExtension
 * - Extension
 * - Blocks
 * - Services (optional, default=true)
 * - Extension point (optional, default=true)
 *
 * @see IExtension.permissions
 * @see IExtensionPoint.permissions
 */
export async function extensionPermissions(
  extension: IExtension,
  options: PermissionOptions = {}
): Promise<Permissions.Permissions> {
  const { includeExtensionPoint = true, includeServices = true } = options;
  const resolved = await resolveDefinitions(extension);

  const extensionPoint =
    options.extensionPoint ??
    (await extensionPointRegistry.lookup(resolved.extensionPointId));

  let servicePermissions: Permissions.Permissions[] = [];

  if (includeServices) {
    servicePermissions = await Promise.all(
      (resolved.services ?? [])
        .filter((x) => x.config)
        .map(async (x) =>
          serviceOriginPermissions({ id: x.id, config: x.config })
        )
    );
  }

  const blocks = await extensionPoint.getBlocks(resolved);
  const blockPermissions = blocks.map((x) => x.permissions);

  return mergePermissions(
    compact([
      extension.permissions ?? {},
      includeExtensionPoint ? extensionPoint.permissions : null,
      ...servicePermissions,
      ...blockPermissions,
    ])
  );
}
