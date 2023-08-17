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
import { type SidebarEntries } from "@/types/sidebarTypes";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { screen, within } from "@testing-library/react";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/ModLauncher";
import useFlags from "@/hooks/useFlags";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import { cancelForm } from "@/contentScript/messenger/api";

jest.mock("@/hooks/useFlags", () =>
  jest.fn().mockReturnValue({ flagOn: jest.fn() })
);

jest.mock("@/contentScript/messenger/api", () => ({
  ...jest.requireActual("@/contentScript/messenger/api"),
  cancelForm: jest.fn(),
}));

const cancelFormMock = cancelForm as jest.MockedFunction<typeof cancelForm>;

async function setupPanelsAndRender(sidebarEntries: Partial<SidebarEntries>) {
  (useFlags as jest.Mock).mockReturnValue({
    flagOn: jest.fn().mockReturnValue(sidebarEntries.staticPanels?.length > 0),
  });

  const renderResult = render(<Tabs />, {
    setupRedux(dispatch) {
      dispatch(
        sidebarSlice.actions.setInitialPanels({
          panels: [],
          staticPanels: [],
          temporaryPanels: [],
          forms: [],
          modActivationPanel: undefined,
          ...sidebarEntries,
        })
      );
    },
  });

  await waitForEffect();

  return renderResult;
}

describe("Tabs", () => {
  const panel = sidebarEntryFactory("panel");

  test("renders", () => {
    const { asFragment } = render(<Tabs />);
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders with panels", async () => {
    await setupPanelsAndRender({ panels: [panel] });

    expect(screen.getByText("Panel Test 1")).toBeInTheDocument();
  });

  describe("Mod Launcher", () => {
    test("renders with mod launcher when flag is enabled", async () => {
      const { asFragment } = await setupPanelsAndRender({
        staticPanels: [MOD_LAUNCHER],
      });

      expect(asFragment()).toMatchSnapshot();
    });

    test("displays no active sidebar panels view when no panels are active", async () => {
      await setupPanelsAndRender({ staticPanels: [MOD_LAUNCHER] });

      expect(
        screen.getByText("We didn't find any mods to run")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Don't worry, there's a solution")
      ).toBeInTheDocument();
    });

    test("can close the mod launcher", async () => {
      await setupPanelsAndRender({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
      });

      expect(screen.getByText("Mods")).toBeInTheDocument();

      within(screen.getByRole("tab", { name: /mods/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /mods/i })
      ).not.toBeInTheDocument();
    });

    test("can open the mod launcher", async () => {
      await setupPanelsAndRender({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
      });

      expect(screen.getByText("Mods")).toBeInTheDocument();

      within(screen.getByRole("tab", { name: /mods/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();

      screen.getByRole("button", { name: "open mod launcher" }).click();

      expect(screen.getByText("Mods")).toBeInTheDocument();
    });

    test("clicking open the mod launcher multiple times does not open multiple mod launchers", async () => {
      await setupPanelsAndRender({ staticPanels: [MOD_LAUNCHER] });

      expect(screen.getByText("Mods")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "open mod launcher" })
      );

      expect(screen.getAllByText("Mods")).toHaveLength(1);
    });
  });

  describe("Persistent Panels", () => {
    test("can close a panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
      });

      within(screen.getByRole("tab", { name: /panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /panel test 1/i })
      ).not.toBeInTheDocument();
    });

    test("cannot close panel when mod launcher is unavailable", async () => {
      await setupPanelsAndRender({ panels: [panel] });

      expect(
        within(screen.getByRole("tab", { name: /panel test 1/i })).queryByRole(
          "button",
          { name: "Close" }
        )
      ).not.toBeInTheDocument();
    });

    test("can open a closed panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
      });

      within(screen.getByRole("tab", { name: /panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /panel test 1/i })
      ).not.toBeInTheDocument();

      screen.getByRole("heading", { name: /panel test 1/i }).click();

      expect(
        screen.getByRole("tab", { name: /panel test 1/i })
      ).toBeInTheDocument();
    });
  });

  describe("Temporary Panels", () => {
    const temporaryPanel = sidebarEntryFactory("temporaryPanel");

    test("can close a temporary panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        temporaryPanels: [temporaryPanel],
        staticPanels: [MOD_LAUNCHER],
      });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /temporary panel test 1/i })
      ).not.toBeInTheDocument();
    });

    test("can close a tempoarary panel when mod launcher is unavailable", async () => {
      await setupPanelsAndRender({ temporaryPanels: [temporaryPanel] });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /temporary panel test 1/i })
      ).not.toBeInTheDocument();
    });

    test("cannot re-open a closed temporary panel with the mod launcher", async () => {
      await setupPanelsAndRender({
        temporaryPanels: [temporaryPanel],
        staticPanels: [MOD_LAUNCHER],
      });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /temporary panel test 1/i })
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole("heading", { name: /temporary panel test 1/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Panels", () => {
    const formPanel = sidebarEntryFactory("form");

    test("renders with forms", async () => {
      await setupPanelsAndRender({ forms: [formPanel] });

      expect(screen.getByText("Form Panel Test")).toBeInTheDocument();
    });

    test("closing the form tab calls cancelForm", async () => {
      await setupPanelsAndRender({
        forms: [formPanel],
        staticPanels: [MOD_LAUNCHER],
      });

      expect(cancelFormMock).not.toHaveBeenCalled();

      within(screen.getByRole("tab", { name: /form panel test/i }))
        .getByRole("button", { name: "Close" })
        .click();

      await waitForEffect();

      expect(cancelFormMock).toHaveBeenCalled();
    });
  });
});
