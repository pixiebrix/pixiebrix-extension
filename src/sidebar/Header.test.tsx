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
import { screen, render } from "@/sidebar/testHelpers";
import Header from "@/sidebar/Header";
import { mockAuthenticatedUser } from "@/testUtils/userMock";

import {
  userFactory,
  userOrganizationFactory,
} from "@/testUtils/factories/authFactories";
import { waitFor } from "@testing-library/react";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Header", () => {
  it("renders", () => {
    const { asFragment } = render(<Header />);

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByTestId("sidebarHeaderLogo")).not.toBeNull();
  });

  it("renders sidebar header logo per organization theme", async () => {
    await mockAuthenticatedUser(
      userFactory({
        organization: userOrganizationFactory({
          theme: {
            show_sidebar_logo: true,
          },
        }),
      }),
    );

    const { asFragment } = render(<Header />);
    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByTestId("sidebarHeaderLogo")).not.toBeNull();
  });

  it("renders no sidebar header logo per organization theme", async () => {
    await mockAuthenticatedUser(
      userFactory({
        organization: userOrganizationFactory({
          theme: {
            show_sidebar_logo: false,
          },
        }),
      }),
    );

    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByTestId("sidebarHeaderLogo")).toBeNull();
    });
  });
});
