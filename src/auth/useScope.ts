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

import { appApi } from "@/services/api";

/**
 * Hook returns the user scope.
 *
 * The hook expects that `getAuth` query (`useGetAuthQuery`) is already resolved.
 */
function useScope(): string | null {
  const { data } = appApi.endpoints.getAuth.useQueryState();
  return data?.scope ?? null;
}

export default useScope;
