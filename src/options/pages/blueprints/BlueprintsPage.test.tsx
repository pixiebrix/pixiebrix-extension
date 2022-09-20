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

import React from "react";
import { render } from "@/options/testHelpers";
import BlueprintsPage from "@/options/pages/blueprints/BlueprintsPage";
import { configureStore } from "@reduxjs/toolkit";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import { Provider } from "react-redux";
import { authSlice } from "@/auth/authSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import {
  useGetCloudExtensionsQuery,
  useGetMarketplaceListingsQuery,
  useGetOrganizationsQuery,
  useGetRecipesQuery,
} from "@/services/api";
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      blueprints: blueprintsSlice.reducer,
      options: extensionsSlice.reducer,
      blueprintModals: blueprintModalsSlice.reducer,
    },
    ...(initialState ?? { preloadedState: initialState }),
  });
}

jest.mock("@/options/pages/blueprints/useInstallableViewItems", () =>
  jest.fn(() => ({
    installableViewItems: [],
    isLoading: false,
  }))
);

jest.mock("@/services/api", () => ({
  useGetRecipesQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetCloudExtensionsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetMarketplaceListingsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetOrganizationsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

beforeEach(() => {
  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: [],
    isLoading: false,
  }));

  (useGetCloudExtensionsQuery as jest.Mock).mockImplementation(() => ({
    data: [],
    isLoading: false,
  }));

  (useGetMarketplaceListingsQuery as jest.Mock).mockImplementation(() => ({
    data: [],
    isLoading: false,
  }));

  (useGetOrganizationsQuery as jest.Mock).mockImplementation(() => ({
    data: [],
    isLoading: false,
  }));
});

const installables: Installable[] = [];

const renderBlueprintsPage = (initialState?: any) => {
  return render(
    <Provider store={optionsStore(initialState)}>
      <BlueprintsCard installables={installables} />
    </Provider>
  );
};

describe("BlueprintsPage", () => {
  test("it renders", () => {
    render(<BlueprintsCard installables={installables} />);
  });
});
