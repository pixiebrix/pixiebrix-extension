/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { render, screen } from "../../../../testHelpers";
import PublishModModals from "./PublishModModals";
import { authSlice } from "@/auth/authSlice";
import { modModalsSlice } from "../modModalsSlice";
import { type ModDefinition } from "../../../../../types/modDefinitionTypes";
import { type AuthState } from "@/auth/authTypes";
import { validateRegistryId } from "../../../../../types/helpers";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import { waitForEffect } from "../../../../../testUtils/testHelpers";
import { appApiMock } from "../../../../../testUtils/appApiMock";
import { defaultModDefinitionFactory } from "../../../../../testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "../../../../../testUtils/factories/metadataFactory";
import { authStateFactory } from "../../../../../testUtils/factories/authFactories";
import { API_PATHS } from "@/data/service/urlPaths";
import { type EmptyObject } from "type-fest";

let modDefinition: ModDefinition;
let auth: AuthState;

jest.mock("../../../../../modDefinitions/modDefinitionHooks", () => ({
  useOptionalModDefinition: jest.fn().mockImplementation(() => ({
    data: modDefinition,
    isFetching: false,
  })),
}));

/**
 * Wrapper component to fetch marketplace listings because the PublishRecipeModals component does not fetch.
 */
const MarketplaceListingsWrapper: React.FC<
  React.PropsWithChildren<EmptyObject>
> = ({ children }) => {
  useGetMarketplaceListingsQuery();
  return <>{children}</>;
};

beforeEach(() => {
  auth = authStateFactory();
  modDefinition = defaultModDefinitionFactory({
    metadata: metadataFactory({
      id: validateRegistryId(`${auth.scope}/test`),
    }),
  });

  // XXX: why do we need to call this if it's already defined in appApiMock?
  appApiMock.onGet(API_PATHS.MARKETPLACE_LISTINGS).reply(200, []);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders publish modal", async () => {
  render(
    <MarketplaceListingsWrapper>
      <PublishModModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          modModalsSlice.actions.setPublishContext({
            modId: modDefinition.metadata.id,
          }),
        );
      },
    },
  );

  await waitForEffect();

  expect(screen.getByRole("dialog")).toMatchSnapshot();
});

test("renders edit publish modal", async () => {
  modDefinition.sharing.public = true;

  render(
    <MarketplaceListingsWrapper>
      <PublishModModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          modModalsSlice.actions.setPublishContext({
            modId: modDefinition.metadata.id,
          }),
        );
      },
    },
  );

  await waitForEffect();

  expect(screen.getByRole("dialog")).toMatchSnapshot();
});

test("renders cancel publish modal", async () => {
  modDefinition.sharing.public = true;

  render(
    <MarketplaceListingsWrapper>
      <PublishModModals />
    </MarketplaceListingsWrapper>,
    {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(auth));

        dispatch(
          modModalsSlice.actions.setPublishContext({
            modId: modDefinition.metadata.id,
            cancelingPublish: true,
          }),
        );
      },
    },
  );

  await waitForEffect();

  expect(screen.getByRole("dialog")).toMatchSnapshot();
});
