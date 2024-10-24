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

import { AppDispatch } from "@/extensionConsole/store";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import type { RegistryId } from "@/types/registryTypes";
import type { UUID } from "@/types/stringTypes";

export const deactivateMod = jest.fn(
  (modId: RegistryId, _modComponentIds: UUID[]) =>
    async (dispatch: AppDispatch) => {
      // Keep the call to dispatch, but leave off reading/writing to the Page Editor storage and runtime side effects
      dispatch(modComponentActions.removeModById(modId));
    },
);

export const removeModDataAndInterfaceFromAllTabs = jest.fn();
