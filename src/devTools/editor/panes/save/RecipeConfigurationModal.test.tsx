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

import AuthContext from "@/auth/AuthContext";
import { anonAuth } from "@/hooks/auth";
import { recipeMetadataFactory } from "@/tests/factories";
import { render, screen } from "@testing-library/react";
import React from "react";
import RecipeConfigurationModal from "./RecipeConfigurationModal";

test("renders Save as New Blueprint button and editable ID field for a new recipe", () => {
  render(
    <AuthContext.Provider
      value={{
        ...anonAuth,
        scope: "@test",
        isPending: false,
        error: undefined,
      }}
    >
      <RecipeConfigurationModal
        initialValues={recipeMetadataFactory()}
        isNewRecipe
        close={jest.fn()}
        navigateBack={jest.fn()}
        save={jest.fn()}
      />
    </AuthContext.Provider>
  );

  const updateBlueprintButton = screen.queryByRole("button", {
    name: "Update Blueprint",
  });
  expect(updateBlueprintButton).toBeNull();

  const saveAsNewBlueprintButton = screen.getByRole("button", {
    name: "Save as New Blueprint",
  });
  expect(saveAsNewBlueprintButton).toHaveClass("btn-primary");

  const idField = screen.getByLabelText("ID");
  expect(idField).toBeEnabled();
});

test("renders Update button and disabled ID field when updating recipe", () => {
  render(
    <RecipeConfigurationModal
      initialValues={recipeMetadataFactory()}
      isNewRecipe={false}
      close={jest.fn()}
      navigateBack={jest.fn()}
      save={jest.fn()}
    />
  );

  const updateBlueprintButton = screen.getByRole("button", {
    name: "Update Blueprint",
  });
  expect(updateBlueprintButton).toHaveClass("btn-primary");

  const saveAsNewBlueprintButton = screen.queryByRole("button", {
    name: "Save as New Blueprint",
  });
  expect(saveAsNewBlueprintButton).toBeNull();

  const idField = screen.getByLabelText("ID");
  expect(idField).toBeDisabled();
});
