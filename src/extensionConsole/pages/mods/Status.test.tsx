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
import Status from "@/extensionConsole/pages/mods/Status";
import useModViewItemActions from "@/extensionConsole/pages/mods/hooks/useModViewItemActions";

jest.mock("@/extensionConsole/pages/mods/hooks/useModViewItemActions", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({}),
}));

const useModViewItemActionsMock = useModViewItemActions as jest.MockedFunction<
  typeof useModViewItemActions
>;

describe("Status", () => {
  beforeEach(() => {
    useModViewItemActionsMock.mockReturnValue({} as any);
  });

  it("shows active", async () => {
    const wrapper = render(
      <Status
        modViewItem={
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
    useModViewItemActionsMock.mockReturnValue({
      activate: jest.fn(),
    } as any);

    const wrapper = render(
      <Status
        modViewItem={
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
        modViewItem={
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
        modViewItem={
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
