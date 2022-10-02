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
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { useGetMeQuery, useGetStarterBlueprintsQuery } from "@/services/api";
import { screen } from "@testing-library/react";
import { organizationFactory } from "@/testUtils/factories";

const EMPTY_RESPONSE = Object.freeze({
  data: Object.freeze([]),
  isLoading: false,
});

// Need to return the same object every time, because useInstallableViewItems doesn't destructure the object. Or maybe
// we just need to make sure the data [] array is the same object?
jest.mock("@/services/api", () => ({
  useGetRecipesQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetMeQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetCloudExtensionsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetMarketplaceListingsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetOrganizationsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetStarterBlueprintsQuery: jest.fn(() => EMPTY_RESPONSE),
}));

const installables: Installable[] = [];

describe("BlueprintsCard", () => {
  test("renders", async () => {
    const rendered = render(<BlueprintsCard installables={installables} />);
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("doesn't flash the 'Get Started' tab while loading", async () => {
    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: true,
    }));

    render(<BlueprintsCard installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();

    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(<BlueprintsCard installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.queryByText("Get Started")).not.toBeNull();
  });

  test("does not show 'Get Started' tab for enterprise users", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: { organization: organizationFactory() },
    }));

    render(<BlueprintsCard installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });
});
