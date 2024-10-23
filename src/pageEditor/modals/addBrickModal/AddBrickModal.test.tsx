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
import { render, screen } from "@/pageEditor/testHelpers";
import AddBrickModal from "@/pageEditor/modals/addBrickModal/AddBrickModal";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import userEvent from "@testing-library/user-event";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import { array } from "cooky-cutter";
import { waitForEffect } from "@/testUtils/testHelpers";
import brickRegistry from "@/bricks/registry";
import {
  echoBrick,
  featureFlagBrick,
} from "@/runtime/pipelineTests/testHelpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import {
  marketplaceListingFactory,
  marketplaceTagFactory,
} from "@/testUtils/factories/marketplaceFactories";
import { PipelineFlavor } from "@/bricks/types";
import { API_PATHS } from "@/data/service/urlPaths";

// Need at least one item so callers see the registry as initialized
brickRegistry.register([echoBrick, featureFlagBrick]);

beforeAll(() => {
  const tags = array(marketplaceTagFactory, 3)({ subtype: "role" });
  const listings = array(marketplaceListingFactory, 10)({ tags });

  appApiMock.reset();
  appApiMock.onGet(API_PATHS.MARKETPLACE_TAGS).reply(200, tags);
  appApiMock.onGet(API_PATHS.MARKETPLACE_LISTINGS).reply(200, listings);
});

describe("AddBrickModal", () => {
  it("renders", async () => {
    const formState = formStateFactory();
    const { asFragment } = render(<AddBrickModal />, {
      setupRedux(dispatch) {
        dispatch(actions.addModComponentFormState(formState));
        dispatch(actions.setActiveModComponentId(formState.uuid));
        dispatch(
          actions.showAddBrickModal({
            path: "",
            flavor: PipelineFlavor.AllBricks,
            index: 0,
          }),
        );
      },
      // This currently produces a warning, but allows us to snapshot the modal
      //  See: https://github.com/testing-library/react-testing-library/issues/62
      container: document.body,
    });

    await waitForEffect();

    // Exclude the feature flagged brick by default
    expect(screen.getByText(echoBrick.name)).toBeInTheDocument();
    expect(screen.queryByText(featureFlagBrick.name)).not.toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  it("includes feature flagged brick", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: [featureFlagBrick.featureFlag],
    });

    const formState = formStateFactory();
    render(<AddBrickModal />, {
      setupRedux(dispatch) {
        dispatch(actions.addModComponentFormState(formState));
        dispatch(actions.setActiveModComponentId(formState.uuid));
        dispatch(
          actions.showAddBrickModal({
            path: "",
            flavor: PipelineFlavor.AllBricks,
            index: 0,
          }),
        );
      },
      // This currently produces a warning, but allows us to snapshot the modal
      //  See: https://github.com/testing-library/react-testing-library/issues/62
      container: document.body,
    });

    await waitForEffect();

    expect(screen.getByText(echoBrick.name)).toBeInTheDocument();
    expect(screen.getByText(featureFlagBrick.name)).toBeInTheDocument();
  });

  it("renders with tag selected and search query", async () => {
    const formState = formStateFactory();

    const { asFragment } = render(<AddBrickModal />, {
      setupRedux(dispatch) {
        dispatch(actions.addModComponentFormState(formState));
        dispatch(actions.setActiveModComponentId(formState.uuid));
        dispatch(
          actions.showAddBrickModal({
            path: PIPELINE_BRICKS_FIELD_NAME,
            flavor: PipelineFlavor.AllBricks,
            index: 0,
          }),
        );
      },
      container: document.body,
    });

    await waitForEffect();

    // Click the last tag
    const tags = screen.getAllByTestId("search-tag-item", {
      exact: false,
    });

    await userEvent.click(tags.at(-1)!);

    // Enter a query
    await userEvent.type(screen.getByTestId("tag-search-input"), "google");

    expect(asFragment()).toMatchSnapshot();
  });
});
