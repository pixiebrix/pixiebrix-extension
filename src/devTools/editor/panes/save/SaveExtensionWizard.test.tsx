/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import SaveExtensionWizard from "./SaveExtensionWizard";
import {
  useCreateRecipeMutation as useCreateRecipeMutationMock,
  useUpdateRecipeMutation as useUpdateRecipeMutationMock,
  useGetRecipesQuery as useGetRecipesQueryMock,
  useGetEditablePackagesQuery as useGetEditablePackagesQueryMock,
} from "@/services/api";
import useSavingWizardMock from "./useSavingWizard";

jest.mock("@/hooks/useNotifications");
jest.mock("@/devTools/editor/hooks/useCreate");

jest.mock("./useSavingWizard");

jest.mock("@/services/api", () => ({
  useCreateRecipeMutation: jest.fn().mockReturnValue([]),
  useUpdateRecipeMutation: jest.fn().mockReturnValue([]),
  useGetRecipesQuery: jest.fn(),
  useGetEditablePackagesQuery: jest.fn(),
}));

beforeEach(() => {
  (useCreateRecipeMutationMock as jest.Mock).mockReturnValue([]);
  (useUpdateRecipeMutationMock as jest.Mock).mockReturnValue([]);
});
afterEach(() => {
  jest.resetAllMocks();
});

test("shows loading when saving is in progress", async () => {
  (useSavingWizardMock as jest.Mock).mockReturnValue({
    savingExtensionId: "test/extension",
    closeWizard: jest.fn(),
  });
  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: null,
    isLoading: false,
  });
  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: null,
    isLoading: false,
  });

  render(<SaveExtensionWizard />);

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
    savingExtensionId: null,
    closeWizard: jest.fn(),
  });
  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: null,
    isLoading: loadingRecipes,
  });
  (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
    data: null,
    isLoading: loadingPackages,
  });

  render(<SaveExtensionWizard />);

  const titleElement = screen.getByText("Loading data...");
  expect(titleElement).not.toBeNull();

  const closeButtonLabel = screen.getByText("Close");
  expect(closeButtonLabel).not.toBeNull();
});
