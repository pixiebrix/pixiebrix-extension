/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { DeploymentContext } from "@/core";

/**
 * Returns `true` if a managed deployment is active (i.e., has not been remotely paused by an admin)
 * @since 1.4.0
 * @see IExtension._deployment
 */
export function isDeploymentActive(extensionLike: {
  _deployment?: DeploymentContext;
}): boolean {
  return (
    extensionLike._deployment?.active == null ||
    extensionLike._deployment.active
  );
}
