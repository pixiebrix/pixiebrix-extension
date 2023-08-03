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
import Tabs from "@/sidebar/Tabs";
import { render } from "@/sidebar/testHelpers";
import { type PanelEntry } from "@/types/sidebarTypes";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { screen, waitFor } from "@testing-library/react";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/ModLauncher";
import useFlags from "@/hooks/useFlags";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/useFlags", () =>
  jest.fn().mockReturnValue({ flagOn: jest.fn() })
);

function setupPanelsAndRender(
  panels: PanelEntry[] = [],
  hasModLauncher = false
) {
  (useFlags as jest.Mock).mockReturnValue({
    flagOn: jest.fn().mockReturnValue(hasModLauncher),
  });

  return render(<Tabs />, {
    setupRedux(dispatch) {
      dispatch(
        sidebarSlice.actions.setInitialPanels({
          panels,
          staticPanels: hasModLauncher ? [MOD_LAUNCHER] : [],
          temporaryPanels: [],
          forms: [],
          modActivationPanel: undefined,
        })
      );
    },
  });
}

describe("Tabs", () => {
  const panel = sidebarEntryFactory("panel");

  test("renders", () => {
    const { asFragment } = render(<Tabs />);
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders with panels", () => {
    setupPanelsAndRender([panel]);

    expect(screen.getByText("Panel Test 1")).toBeInTheDocument();
  });

  describe("Mod Launcher", () => {
    test("renders with mod launcher when flag is enabled", async () => {
      const { asFragment } = setupPanelsAndRender([], true);

      await waitForEffect();

      expect(asFragment()).toMatchSnapshot();
    });

    test("displays no active sidebar panels view when no panels are active", async () => {
      setupPanelsAndRender([], true);

      await waitForEffect();

      expect(
        screen.getByText("We didn't find any mods to run")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Don't worry, there's a solution")
      ).toBeInTheDocument();
    });

    test("can close the mod launcher", () => {
      setupPanelsAndRender([panel], true);

      expect(screen.getByText("Mods")).toBeInTheDocument();

      screen.getByRole("button", { name: "Close" }).click();

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();
    });

    test("can open the mod launcher", () => {
      setupPanelsAndRender([panel], true);

      expect(screen.getByText("Mods")).toBeInTheDocument();

      screen.getByRole("button", { name: "Close" }).click();

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();

      screen.getByRole("button", { name: "open mod launcher" }).click();

      expect(screen.getByText("Mods")).toBeInTheDocument();
    });

    test("clicking open the mod launcher multiple times does not open multiple mod launchers", async () => {
      setupPanelsAndRender([], true);

      expect(screen.getByText("Mods")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "open mod launcher" })
      );

      expect(screen.getAllByText("Mods")).toHaveLength(1);
    });
  });
});
