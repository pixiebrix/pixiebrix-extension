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

import { useSelector } from "react-redux";
import type { RegistryId } from "@/types/registryTypes";
import type { ModInstance } from "@/types/modInstanceTypes";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";

/**
 * Hook to the activated mod instance for a given mod, or undefined if the mod is not activated on the device.
 * @param modId the mod id to find
 * @returns the mod instance or undefined, if the mod is not activated
 */
export default function useFindModInstance(
  modId: RegistryId,
): ModInstance | undefined {
  const modInstanceMap = useSelector(selectModInstanceMap);
  return modInstanceMap.get(modId);
}
