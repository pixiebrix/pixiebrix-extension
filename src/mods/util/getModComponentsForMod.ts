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

import type {
  ModComponentsRootState,
  ModComponentState,
} from "@/store/modComponents/modComponentTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import type { RegistryId } from "@/types/registryTypes";
import { selectGetModComponentsForMod } from "@/store/modComponents/modComponentSelectors";

export default function getModComponentsForMod(
  modId: RegistryId,
  modComponentState: ModComponentState,
): ActivatedModComponent[] {
  const modComponentsState: ModComponentsRootState = {
    options: modComponentState,
  };
  const getModComponentsForMod =
    selectGetModComponentsForMod(modComponentsState);
  return getModComponentsForMod(modId);
}
