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

import { RootState } from "@/options/store";

export const selectView = (state: RootState) => state.blueprints.view;
export const selectGroupBy = (state: RootState) => state.blueprints.groupBy;
export const selectSortBy = (state: RootState) => state.blueprints.sortBy;
export const selectFilters = (state: RootState) => state.blueprints.filters;
