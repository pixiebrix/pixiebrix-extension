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
import { render } from "@/extensionConsole/testHelpers";
import PublishRecipeModals from "./PublishRecipeModals";
import { authSlice } from "@/auth/authSlice";
import { blueprintModalsSlice } from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";
import {
  authStateFactory,
  recipeFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type AuthState } from "@/auth/authTypes";
import { validateRegistryId } from "@/types/helpers";

let blueprint: RecipeDefinition;
let auth: AuthState;

jest.mock("@/recipes/recipesHooks", () => ({
  useRecipe: jest.fn().mockImplementation(() => ({
    data: blueprint,
    isFetching: false,
  })),
}));
jest.mock("@/services/api", () => ({
  appApi: {
    endpoints: {
      getMarketplaceListings: {
        useQueryState: jest.fn().mockReturnValue({ data: {} }),
      },
    },
  },
  useGetEditablePackagesQuery: jest
    .fn()
    .mockReturnValue({ data: [], isFetching: false }),
  useUpdateRecipeMutation: jest.fn().mockReturnValue([jest.fn()]),
}));

beforeEach(() => {
  auth = authStateFactory();
  blueprint = recipeFactory({
    metadata: recipeMetadataFactory({
      id: validateRegistryId(`${auth.scope}/test`),
    }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders publish modal", () => {
  const rendered = render(<PublishRecipeModals />, {
    setupRedux(dispatch) {
      dispatch(authSlice.actions.setAuth(auth));

      dispatch(
        blueprintModalsSlice.actions.setPublishContext({
          blueprintId: blueprint.metadata.id,
        })
      );
    },
  });

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});

test("renders edit publish modal", () => {
  blueprint.sharing.public = true;

  const rendered = render(<PublishRecipeModals />, {
    setupRedux(dispatch) {
      dispatch(authSlice.actions.setAuth(auth));

      dispatch(
        blueprintModalsSlice.actions.setPublishContext({
          blueprintId: blueprint.metadata.id,
        })
      );
    },
  });

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});

test("renders cancel publish modal", () => {
  blueprint.sharing.public = true;

  const rendered = render(<PublishRecipeModals />, {
    setupRedux(dispatch) {
      dispatch(authSlice.actions.setAuth(auth));

      dispatch(
        blueprintModalsSlice.actions.setPublishContext({
          blueprintId: blueprint.metadata.id,
          cancelingPublish: true,
        })
      );
    },
  });

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});
