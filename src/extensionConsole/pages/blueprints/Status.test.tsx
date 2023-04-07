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
import { render } from "@testing-library/react";
import Status from "@/extensionConsole/pages/blueprints/Status";

import useInstallableViewItemActions from "./useInstallableViewItemActions";

jest.mock("./useInstallableViewItemActions", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({}),
}));

const useInstallableViewItemActionsMock =
  useInstallableViewItemActions as jest.MockedFunction<
    typeof useInstallableViewItemActions
  >;

describe("Status", () => {
  beforeEach(() => {
    useInstallableViewItemActionsMock.mockReturnValue({} as any);
  });

  it("shows active", async () => {
    const wrapper = render(
      <Status
        installableViewItem={
          {
            active: true,
          } as any
        }
      />
    );

    expect(wrapper.getByText("Active")).toBeVisible();
    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it("shows activate", async () => {
    useInstallableViewItemActionsMock.mockReturnValue({
      activate: jest.fn(),
    } as any);

    const wrapper = render(
      <Status
        installableViewItem={
          {
            active: true,
          } as any
        }
      />
    );

    expect(wrapper.getByText("Activate")).toBeVisible();
    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it("shows warning for unavailable", async () => {
    const wrapper = render(
      <Status
        installableViewItem={
          {
            unavailable: true,
          } as any
        }
      />
    );

    expect(wrapper.getByText("No longer available")).toBeVisible();
    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it("paused", async () => {
    const wrapper = render(
      <Status
        installableViewItem={
          {
            status: "Paused",
          } as any
        }
      />
    );

    expect(wrapper.getByText("Paused")).toBeVisible();
    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
