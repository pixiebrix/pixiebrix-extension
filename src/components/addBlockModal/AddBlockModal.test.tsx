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
import {
  formStateFactory,
  marketplaceListingFactory,
  marketplaceTagFactory,
} from "@/testUtils/factories";
import { render, screen } from "@/pageEditor/testHelpers";
import AddBlockModal from "@/components/addBlockModal/AddBlockModal";
import { actions } from "@/pageEditor/slices/editorSlice";
import userEvent from "@testing-library/user-event";
import { PipelineType } from "@/pageEditor/pageEditorTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import * as api from "@/services/api";
import { RegistryId } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { waitForEffect } from "@/testUtils/testHelpers";
import { useAsyncIcon } from "@/components/asyncIcon";
import { faCube } from "@fortawesome/free-solid-svg-icons";

jest.mock("@/services/api");
jest.mock("@/components/asyncIcon", () => ({
  useAsyncIcon: jest.fn(),
}));

beforeAll(() => {
  const tags = [
    marketplaceTagFactory({ subtype: "role" }),
    marketplaceTagFactory({ subtype: "role" }),
    marketplaceTagFactory({ subtype: "role" }),
  ];
  (api.useGetMarketplaceTagsQuery as jest.Mock).mockReturnValue({
    data: tags,
    isLoading: false,
  });
  const listings: Record<RegistryId, MarketplaceListing> = {};
  for (let i = 0; i < 10; i++) {
    const listing = marketplaceListingFactory({ tags });
    listings[listing.id as RegistryId] = listing;
  }

  (api.useGetMarketplaceListingsQuery as jest.Mock).mockReturnValue({
    data: listings,
    isLoading: false,
  });

  (useAsyncIcon as jest.Mock).mockReturnValue(faCube);
});

describe("AddBlockModal", () => {
  test("it renders", async () => {
    const formState = formStateFactory();
    const rendered = render(<AddBlockModal />, {
      setupRedux(dispatch) {
        dispatch(actions.addElement(formState));
        dispatch(actions.selectElement(formState.uuid));
        dispatch(
          actions.showAddBlockModal({
            path: "",
            type: PipelineType.Root,
            index: 0,
          })
        );
      },
    });

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders with tag selected and search query", async () => {
    const formState = formStateFactory();

    const rendered = render(<AddBlockModal />, {
      setupRedux(dispatch) {
        dispatch(actions.addElement(formState));
        dispatch(actions.selectElement(formState.uuid));
        dispatch(
          actions.showAddBlockModal({
            path: PIPELINE_BLOCKS_FIELD_NAME,
            type: PipelineType.Root,
            index: 0,
          })
        );
      },
    });

    // Click the last tag
    const tags = screen.getAllByTestId("search-tag-item", {
      exact: false,
    });
    await userEvent.click(tags.at(-1));

    // Enter a query
    await userEvent.type(screen.getByTestId("tag-search-input"), "google");

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
