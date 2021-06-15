/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ExtensionOptions, OptionsState } from "@/options/slices";
import { IExtension } from "@/core";

export type RecipeContext = {
  id: string;
  name: string;
};

/**
 * Extension with additional metadata about how it was installed.
 */
export interface InstalledExtension extends IExtension {
  _recipe: RecipeContext | null;
}

export function selectExtensions({
  options,
}: {
  options: OptionsState;
}): ExtensionOptions[] {
  return Object.values(options.extensions).flatMap((extensionPointOptions) =>
    Object.values(extensionPointOptions)
  );
}

export function selectInstalledExtensions(state: {
  options: OptionsState;
}): InstalledExtension[] {
  return Object.entries(state.options.extensions).flatMap(
    ([extensionPointId, pointExtensions]) =>
      Object.entries(pointExtensions).map(([extensionId, extension]) => ({
        id: extensionId,
        extensionPointId,
        ...extension,
      }))
  );
}
