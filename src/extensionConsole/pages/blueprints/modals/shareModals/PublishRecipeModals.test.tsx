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
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type AuthState } from "@/auth/authTypes";
import { validateRegistryId } from "@/types/helpers";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { waitForEffect } from "@/testUtils/testHelpers";
import { appApiMock } from "@/testUtils/appApiMock";
import {
  recipeFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories/recipeFactories";
import { authStateFactory } from "@/testUtils/factories/authFactories";

let blueprint: RecipeDefinition;
let auth: AuthState;

jest.mock("@/recipes/recipesHooks", () => ({
  useOptionalRecipe: jest.fn().mockImplementation(() => ({
    data: blueprint,
    isFetching: false,
  })),
}));

/**
 * Wrapper component to fetch marketplace listings because the PublishRecipeModals component does not fetch.
 */
const MarketplaceListingsWrapper: React.FC = ({ children }) => {
  useGetMarketplaceListingsQuery();
  return <>{children}</>;
};

beforeEach(() => {
  auth = authStateFactory();
  blueprint = recipeFactory({
    metadata: recipeMetadataFactory({
      id: validateRegistryId(`${auth.scope}/test`),
    }),
  });

  // XXX: why do we need to call this if it's already defined in appApiMock?
  appApiMock.onGet("/api/marketplace/listings/").reply(200, []);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders publish modal", async () => {
  const rendered = render(
    <MarketplaceListingsWrapper>
      <PublishRecipeModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          blueprintModalsSlice.actions.setPublishContext({
            blueprintId: blueprint.metadata.id,
          })
        );
      },
    }
  );

  await waitForEffect();

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});

test("renders edit publish modal", async () => {
  blueprint.sharing.public = true;

  const rendered = render(
    <MarketplaceListingsWrapper>
      <PublishRecipeModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          blueprintModalsSlice.actions.setPublishContext({
            blueprintId: blueprint.metadata.id,
          })
        );
      },
    }
  );

  await waitForEffect();

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});

test("renders cancel publish modal", async () => {
  blueprint.sharing.public = true;

  const rendered = render(
    <MarketplaceListingsWrapper>
      <PublishRecipeModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          blueprintModalsSlice.actions.setPublishContext({
            blueprintId: blueprint.metadata.id,
            cancelingPublish: true,
          })
        );
      },
    }
  );

  await waitForEffect();

  expect(rendered.getByRole("dialog")).toMatchSnapshot();
});
