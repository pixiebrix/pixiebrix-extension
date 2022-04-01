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

import { render, screen } from "@testing-library/react";
import React from "react";
import SavingExtensionModal from "./SavingExtensionModal";
import { define } from "cooky-cutter";
import {
  extensionPointConfigFactory,
  installedRecipeMetadataFactory,
  recipeFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories";
import { FormState } from "@/pageEditor/pageEditorTypes";

const simpleElementFactory = define<FormState>({
  apiVersion: "v2",
  recipe: recipeMetadataFactory,
} as any);

function expectAllRecipeButton() {
  const updateBlueprintButton = screen.getByText("Update Blueprint");
  expect(updateBlueprintButton).toHaveClass("btn-primary");

  const saveAsNewBlueprintButton = screen.getByText("Save as New Blueprint");
  expect(saveAsNewBlueprintButton).toHaveClass("btn-secondary");

  const saveAsPersonalExtensionButton = screen.getByText(
    "Save as Personal Extension"
  );
  expect(saveAsPersonalExtensionButton).toHaveClass("btn-secondary");

  const cancelButton = screen.getByText("Cancel");
  expect(cancelButton).toHaveClass("btn-info");
}

function expectNoRecipeButtons() {
  const updateBlueprintButton = screen.queryByText("Update Blueprint");
  expect(updateBlueprintButton).toBeNull();

  const saveAsNewBlueprintButton = screen.queryByText("Save as New Blueprint");
  expect(saveAsNewBlueprintButton).toBeNull();

  const saveAsPersonalExtensionButton = screen.getByText(
    "Save as Personal Extension"
  );
  expect(saveAsPersonalExtensionButton).toHaveClass("btn-primary");

  const cancelButton = screen.getByText("Cancel");
  expect(cancelButton).toHaveClass("btn-info");
}

test("renders all buttons when Recipe is editable", () => {
  const recipe = recipeFactory();
  const element = simpleElementFactory();

  render(
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable
      close={jest.fn()}
      saveAsPersonalExtension={jest.fn()}
      showCreateRecipeModal={jest.fn()}
      showUpdateRecipeModal={jest.fn()}
    />
  );

  expectAllRecipeButton();
});

test("doesn't render recipe buttons when recipe is editable and not latest version", () => {
  const recipe = recipeFactory({
    metadata: installedRecipeMetadataFactory({
      version: "2.0.0",
    }),
  });
  const element = simpleElementFactory();

  render(
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable
      close={jest.fn()}
      saveAsPersonalExtension={jest.fn()}
      showCreateRecipeModal={jest.fn()}
      showUpdateRecipeModal={jest.fn()}
    />
  );

  expectNoRecipeButtons();
});

test("renders new recipe button when recipe is not editable", () => {
  const recipe = recipeFactory();
  const element = simpleElementFactory();

  render(
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable={false}
      close={jest.fn()}
      saveAsPersonalExtension={jest.fn()}
      showCreateRecipeModal={jest.fn()}
      showUpdateRecipeModal={jest.fn()}
    />
  );

  const updateBlueprintButton = screen.queryByText("Update Blueprint");
  expect(updateBlueprintButton).toBeNull();

  const saveAsNewBlueprintButton = screen.getByText("Save as New Blueprint");
  expect(saveAsNewBlueprintButton).toHaveClass("btn-primary");

  const saveAsPersonalExtensionButton = screen.getByText(
    "Save as Personal Extension"
  );
  expect(saveAsPersonalExtensionButton).toHaveClass("btn-secondary");

  const cancelButton = screen.getByText("Cancel");
  expect(cancelButton).toHaveClass("btn-info");
});

test("doesn't render recipe buttons when extension API is not compatible with recipe", () => {
  const recipe = recipeFactory({
    apiVersion: "v2",
    definitions: null,
    extensionPoints: [
      extensionPointConfigFactory(),
      extensionPointConfigFactory(),
    ],
  });
  const element = simpleElementFactory({
    apiVersion: "v3",
  });

  render(
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable
      close={jest.fn()}
      saveAsPersonalExtension={jest.fn()}
      showCreateRecipeModal={jest.fn()}
      showUpdateRecipeModal={jest.fn()}
    />
  );

  expectNoRecipeButtons();
});

test("renders all buttons when extension API version changes and it's the only extension inf the recipe", () => {
  const recipe = recipeFactory({
    apiVersion: "v2",
  });
  const element = simpleElementFactory({
    apiVersion: "v3",
  });

  render(
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable
      close={jest.fn()}
      saveAsPersonalExtension={jest.fn()}
      showCreateRecipeModal={jest.fn()}
      showUpdateRecipeModal={jest.fn()}
    />
  );

  expectAllRecipeButton();
});
