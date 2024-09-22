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
import { useMemo } from "react";
import type { RegistryId } from "@/types/registryTypes";
import type { ModInstance } from "@/types/modInstanceTypes";
import { selectGetModInstanceForMod } from "@/store/modComponents/modInstanceSelectors";

/**
 * Returns the activated mod instances for a given mod, or undefined if the mod is not activated on the device.
 * @param modId the mod id to search for
 */
export default function useFindModInstance(
  modId: RegistryId,
): ModInstance | undefined {
  const getModInstanceForMod = useSelector(selectGetModInstanceForMod);
  return useMemo(
    () => getModInstanceForMod(modId),
    [modId, getModInstanceForMod],
  );
}
