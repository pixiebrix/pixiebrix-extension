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

import { fireEvent, screen } from "@testing-library/react";
import SaveExtensionWizard from "./SaveExtensionWizard";
import {
  useGetEditablePackagesQuery as useGetEditablePackagesQueryMock,
  useGetRecipesQuery as useGetRecipesQueryMock,
} from "@/services/api";
import useSavingWizardMock from "./useSavingWizard";
import {
  formStateFactory,
  installedRecipeMetadataFactory,
  recipeFactory,
} from "@/testUtils/factories";
import { uuidv4 } from "@/types/helpers";
import {
  createRenderFunctionWithRedux,
  waitForEffect,
} from "@/testUtils/testHelpers";
import { anonAuth } from "@/auth/authConstants";
import { authSlice } from "@/auth/authSlice";
import settingsSlice from "@/store/settingsSlice";

jest.unmock("react-redux");

jest.mock("@/utils/notify");
jest.mock("./useSavingWizard");

jest.mock("@/services/api", () => ({
  appApi: {
    useUpdateScopeMutation: () => [jest.fn()],
    useLazyGetMeQuery: () => [jest.fn()],
  },
  useGetRecipesQuery: jest.fn(),
  useGetEditablePackagesQuery: jest.fn(),
}));

const renderSaveExtensionWizard = createRenderFunctionWithRedux({
  reducer: {
    auth: authSlice.reducer,
    settings: settingsSlice.reducer,
  },
  preloadedState: {
    auth: anonAuth,
  },
  ComponentUnderTest: SaveExtensionWizard,
});

beforeEach(() => {
  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });
  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });
});
afterEach(() => {
  jest.resetAllMocks();
});

test("shows loading when saving is in progress", async () => {
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: true,
  });

  renderSaveExtensionWizard();

  const titleElement = screen.getByText("Saving extension...");
  expect(titleElement).not.toBeNull();

  const closeButtonLabel = screen.queryByText("Close");
  expect(closeButtonLabel).toBeNull();
});

test.each([
  ["loading recipes", true, false],
  ["loading packages", false, true],
])("shows loader when %s", (testName, loadingRecipes, loadingPackages) => {
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: false,
  });
  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [],
    isLoading: loadingRecipes,
  });
  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: [],
    isLoading: loadingPackages,
  });

  renderSaveExtensionWizard();

  const titleElement = screen.getByText("Loading data...");
  expect(titleElement).not.toBeNull();

  const closeButtonLabel = screen.getByText("Close");
  expect(closeButtonLabel).not.toBeNull();
});

test("calls Save as Personal extension", async () => {
  const saveElementAsPersonalExtensionMock = jest.fn();
  const metadata = installedRecipeMetadataFactory();
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: false,
    element: formStateFactory({
      recipe: metadata,
    }),
    saveElementAsPersonalExtension: saveElementAsPersonalExtensionMock,
  });

  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [recipeFactory({ metadata }), recipeFactory()],
    isLoading: false,
  });

  renderSaveExtensionWizard();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Save as Personal Extension",
    })
  );

  expect(saveElementAsPersonalExtensionMock).toHaveBeenCalled();
});

test("calls Save as New Blueprint", async () => {
  const saveElementAndCreateNewRecipeMock = jest.fn();
  const metadata = installedRecipeMetadataFactory();
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: false,
    element: formStateFactory({
      recipe: metadata,
    }),
    saveElementAndCreateNewRecipe: saveElementAndCreateNewRecipeMock,
  });

  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [recipeFactory({ metadata }), recipeFactory()],
    isLoading: false,
  });

  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: [{ name: metadata.id, id: uuidv4() }],
    isLoading: false,
  });

  renderSaveExtensionWizard({
    stateOverride: {
      auth: {
        ...anonAuth,
        scope: "@test",
      },
    },
  });

  // Clicking Save as New Blueprint on the first modal
  fireEvent.click(
    screen.getByRole("button", {
      name: "Save as New Blueprint",
    })
  );
  // Confirming Save as New Blueprint on the second modal
  fireEvent.click(
    screen.getByRole("button", {
      name: "Save as New Blueprint",
    })
  );

  // Formik runs its submit callback in a next tick, awaiting
  await waitForEffect();

  expect(saveElementAndCreateNewRecipeMock).toHaveBeenCalled();
});

test("requires user context to save as new blueprint", async () => {
  const saveElementAndCreateNewRecipeMock = jest.fn();
  const metadata = installedRecipeMetadataFactory();
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: false,
    element: formStateFactory({
      recipe: metadata,
    }),
    saveElementAndCreateNewRecipe: saveElementAndCreateNewRecipeMock,
  });

  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [recipeFactory({ metadata }), recipeFactory()],
    isLoading: false,
  });

  renderSaveExtensionWizard();

  // Clicking Save as New Blueprint on the first modal
  fireEvent.click(
    screen.getByRole("button", {
      name: "Save as New Blueprint",
    })
  );

  // Scope input field is on the screen
  const scopeInput = await screen.findAllByLabelText("Account Alias");
  expect(scopeInput).not.toBeNull();
});

test("calls Update Blueprint", async () => {
  const saveElementAndUpdateRecipeMock = jest.fn();
  const metadata = installedRecipeMetadataFactory();
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    isSaving: false,
    element: formStateFactory({
      recipe: metadata,
    }),
    saveElementAndUpdateRecipe: saveElementAndUpdateRecipeMock,
  });

  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [recipeFactory({ metadata }), recipeFactory()],
    isLoading: false,
  });

  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: [{ name: metadata.id, id: uuidv4() }],
    isLoading: false,
  });

  renderSaveExtensionWizard();

  // Clicking Update Blueprint on the first modal
  fireEvent.click(
    screen.getByRole("button", {
      name: "Update Blueprint",
    })
  );

  // Confirming Update Blueprint on the second modal
  fireEvent.click(
    screen.getByRole("button", {
      name: "Update Blueprint",
    })
  );

  // Formik runs its submit callback in a next tick, awaiting
  await waitForEffect();

  expect(saveElementAndUpdateRecipeMock).toHaveBeenCalled();
});
