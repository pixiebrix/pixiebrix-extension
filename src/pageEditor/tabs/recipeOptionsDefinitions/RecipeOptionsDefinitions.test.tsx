/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React from "react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "@/pageEditor/testHelpers";
import RecipeOptionsDefinition from "@/pageEditor/tabs/recipeOptionsDefinitions/RecipeOptionsDefinition";
import { waitForEffect } from "@/testUtils/testHelpers";
import selectEvent from "react-select-event";
import { screen } from "@testing-library/react";
import { recipeDefinitionFactory } from "@/testUtils/factories";
import extensionsSlice from "@/store/extensionsSlice";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/useFlags", () =>
  jest.fn().mockReturnValue({
    flagOn: jest.fn().mockReturnValue(true),
  })
);

beforeAll(() => {
  registerDefaultWidgets();
});

describe("RecipeOptionsDefinitions", () => {
  it("shows google sheets field type option", async () => {
    const recipe = recipeDefinitionFactory();

    render(<RecipeOptionsDefinition />, {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.installRecipe({
            recipe,
            extensionPoints: recipe.extensionPoints,
          })
        );
      },
    });
    await waitForEffect();

    await userEvent.click(screen.getByText("Add new field"));

    const inputTypeSelector = screen.getByLabelText("Input Type");
    selectEvent.openMenu(inputTypeSelector);
    expect(screen.getByText("Checkbox")).toBeVisible();
    expect(screen.getByText("Google Sheet")).toBeVisible();
  });
});
