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

import type { ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";

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

  // For now, just return the activated mod components directly. In the future, we'll likely store ModInstances
  // in the state instead so this selector will be re-written to map the ModInstances to their components
  return options.activatedModComponents;
}
