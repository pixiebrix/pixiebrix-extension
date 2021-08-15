/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { OptionsState } from "@/options/slices";
import { IExtension } from "@/core";

export type RecipeContext = {
  id: string;
  name: string;
};

export function selectExtensions({
  options,
}: {
  options: OptionsState;
}): Array<IExtension<Record<string, unknown>>> {
  return Object.values(options.extensions).flatMap((extensionPointOptions) =>
    Object.values(extensionPointOptions)
  );
}

export function selectInstalledExtensions(state: {
  options: OptionsState;
}): IExtension[] {
  return Object.entries(state.options.extensions).flatMap(
    ([extensionPointId, pointExtensions]) =>
      Object.entries(pointExtensions).map(([extensionId, extension]) => ({
        id: extensionId,
        extensionPointId,
        ...extension,
      }))
  );
}
