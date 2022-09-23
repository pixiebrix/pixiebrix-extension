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

const EMPTY_RESPONSE = Object.freeze({
  data: Object.freeze([]),
  isLoading: false,
});

// Need to return the same object every time, because useInstallableViewItems doesn't destructure the object. Or maybe
// we just need to make sure the data [] array is the same object?
jest.mock("@/services/api", () => ({
  useGetRecipesQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetCloudExtensionsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetMarketplaceListingsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetOrganizationsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetStarterBlueprintsQuery: jest.fn(() => EMPTY_RESPONSE),
}));

const installables: Installable[] = [];

describe("BlueprintsPage", () => {
  test("it renders", async () => {
    const rendered = render(<BlueprintsCard installables={installables} />);
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
