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

import { recipeFactory } from "@/testUtils/factories";
import { serializeError } from "serialize-error";
import { recipesActions } from "./recipesSlice";
import { RecipesRootState } from "./recipesTypes";
import registry from "./registry";

jest.mock("./registry", () => ({
  __esModule: true,
  default: {
    all: jest.fn(),
    fetch: jest.fn(),
  },
}));

afterEach(() => {
  jest.resetAllMocks();
});

describe("loadRecipesFromCache", () => {
  test("calls registry and dispatches setRecipes action", async () => {
    const dispatch = jest.fn();
    const cachedRecipes = [recipeFactory()];
    (registry.all as jest.Mock).mockResolvedValueOnce(cachedRecipes);

    const thunkFunction = recipesActions.loadRecipesFromCache();
    await thunkFunction(dispatch, () => ({}), undefined);
    expect(registry.all).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      recipesActions.setRecipes(cachedRecipes)
    );
  });
});

describe("refreshRecipes", () => {
  test("doesn't refresh if already loading", async () => {
    const dispatch = jest.fn();
    (registry.fetch as jest.Mock).mockResolvedValueOnce(undefined);

    const thunkFunction = recipesActions.refreshRecipes();
    await thunkFunction(
      dispatch,
      () => ({
        recipes: { recipes: [], isFetching: true, error: undefined },
      }),
      undefined
    );

    expect(registry.fetch).not.toHaveBeenCalled();
  });

  test("fetches recipes and updates the state", async () => {
    const dispatch = jest.fn();

    const cachedRecipes = [recipeFactory()];
    (registry.fetch as jest.Mock).mockResolvedValueOnce(undefined);
    (registry.all as jest.Mock).mockResolvedValueOnce(cachedRecipes);

    const thunkFunction = recipesActions.refreshRecipes();
    await thunkFunction(
      dispatch,
      () => ({ recipes: {} } as RecipesRootState),
      undefined
    );

    expect(dispatch).toHaveBeenCalledWith(recipesActions.setLoading(true));
    expect(registry.fetch).toHaveBeenCalledTimes(1);
    expect(registry.all).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      recipesActions.setRecipes(cachedRecipes)
    );
    expect(dispatch).toHaveBeenCalledWith(recipesActions.setLoading(false));
  });

  test("does't change loading state with backgroundRefresh", async () => {
    const dispatch = jest.fn();

    (registry.fetch as jest.Mock).mockResolvedValueOnce(undefined);

    const thunkFunction = recipesActions.refreshRecipes({
      backgroundRefresh: true,
    });
    await thunkFunction(
      dispatch,
      () => ({ recipes: {} } as RecipesRootState),
      undefined
    );

    expect(dispatch).not.toHaveBeenCalledWith(recipesActions.setLoading(true));
    expect(dispatch).not.toHaveBeenCalledWith(recipesActions.setLoading(false));
  });

  test("sets error state", async () => {
    const dispatch = jest.fn();

    const error = new Error("test");
    (registry.fetch as jest.Mock).mockRejectedValueOnce(error);

    const thunkFunction = recipesActions.refreshRecipes();
    await thunkFunction(
      dispatch,
      () => ({ recipes: {} } as RecipesRootState),
      undefined
    );

    const serializedError = serializeError(error, { useToJSON: false });
    expect(dispatch).toHaveBeenCalledWith(
      recipesActions.setError(serializedError)
    );
  });
});
