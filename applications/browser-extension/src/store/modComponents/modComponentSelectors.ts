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

import type { ModComponentsRootState } from "./modComponentTypes";
import type { ActivatedModComponent } from "../../types/modComponentTypes";
import { createSelector } from "@reduxjs/toolkit";

/**
 * Select all activated mod components. Includes activated components associated with paused deployments.
 * Prefer selectModInstances where possible.
 * @see selectModInstances
 */
export function selectActivatedModComponents({
  options,
}: ModComponentsRootState): ActivatedModComponent[] {
  if (!Array.isArray(options.activatedModComponents)) {
    console.warn("state migration has not been applied yet", {
      options,
    });
    throw new TypeError("state migration has not been applied yet");
  }

  // For now, just return the activated mod components directly. In the future work, we'll potentially store
  // ModInstances in the state instead so this selector will be re-written to map the ModInstances to their components
  // See https://www.notion.so/pixiebrix/Simplify-data-representation-of-activated-mods-to-simplify-code-and-eliminate-common-bugs-10b43b21a25380eaac05d286ca2acb88?pvs=4
  return options.activatedModComponents;
}

/**
 * Selects a map of activated mod components by their mod component id.
 * Prefer selectModInstanceMap where possible.
 * @see selectModInstanceMap
 */
export const selectActivatedModComponentsMap = createSelector(
  selectActivatedModComponents,
  (activatedModComponents) =>
    new Map(
      activatedModComponents.map((modComponent) => [
        modComponent.id,
        modComponent,
      ]),
    ),
);
