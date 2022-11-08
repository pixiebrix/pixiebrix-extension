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

import { useEffect } from "react";
import { tabStateActions } from "@/pageEditor/tabState/tabStateSlice";
import { recipesActions } from "@/recipes/recipesSlice";
import { useDispatch } from "react-redux";
import { logActions } from "@/components/logViewer/logSlice";

export function useDispatchInitActions(): void {
  const dispatch = useDispatch();

  useEffect(() => {
    // Automatically connect on load
    dispatch(tabStateActions.connectToContentScript());

    // Load recipes from cache and refresh from server
    dispatch(recipesActions.loadRecipesFromCache());
    dispatch(recipesActions.refreshRecipes({ backgroundRefresh: true }));

    // Start polling logs
    // dispatch(logActions.pollLogs());
  }, [dispatch]);
}
