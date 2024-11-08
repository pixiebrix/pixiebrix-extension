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
import Tabs from "./Tabs";
import { render, screen, waitFor, within } from "./testHelpers";
import { type SidebarEntries, type SidebarEntry } from "@/types/sidebarTypes";
import sidebarSlice from "../store/sidebar/sidebarSlice";
import { sidebarEntryFactory } from "../testUtils/factories/sidebarEntryFactories";
import { MOD_LAUNCHER } from "../store/sidebar/constants";
import { waitForEffect } from "../testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import * as messengerApi from "../contentScript/messenger/api";
import { eventKeyForEntry } from "../store/sidebar/eventKeyUtils";
import { mockAllApiEndpoints } from "../testUtils/appApiMock";
import { type ModComponentRef } from "@/types/modComponentTypes";

mockAllApiEndpoints();

jest.mock("../contentScript/messenger/api", () => ({
  ...jest.requireActual("@/contentScript/messenger/api"),
  getReservedSidebarEntries: jest.fn(),
}));

const cancelFormSpy = jest.spyOn(messengerApi, "cancelForm");
const hideSidebarSpy = jest.spyOn(window, "close").mockImplementation(() => {});

async function setupPanelsAndRender(options: {
  sidebarEntries?: Partial<SidebarEntries>;
  showModLauncher?: boolean;
  reservedSidebarEntries?: Partial<SidebarEntries>;
  initialModComponentRef?: ModComponentRef;
  initialClosedEntries?: SidebarEntry[];
}) {
  const {
    sidebarEntries = {},
    showModLauncher = true,
    reservedSidebarEntries = {},
    initialModComponentRef,
    initialClosedEntries = [],
  } = options;
  jest.mocked(messengerApi.getReservedSidebarEntries).mockImplementation(
    () =>
      ({
        panels: [],
        temporaryPanels: [],
        forms: [],
        modActivationPanel: null,
        ...reservedSidebarEntries,
      }) as any,
  );

  const utils = render(<Tabs />, {
    setupRedux(dispatch) {
      for (const closedEntry of initialClosedEntries) {
        dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(closedEntry)));
      }

      dispatch(
        sidebarSlice.actions.setInitialPanels({
          initialModComponentRef,
          panels: [],
          staticPanels: [],
          temporaryPanels: [],
          forms: [],
          modActivationPanel: null,
          ...sidebarEntries,
        }),
      );

      if (!showModLauncher) {
        dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(MOD_LAUNCHER)));
      }
    },
  });

  await waitForEffect();

  return utils;
}

describe("Tabs", () => {
  const panel = sidebarEntryFactory("panel");
  const panel2 = sidebarEntryFactory("panel");

  test("renders", () => {
    render(<Tabs />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  test("renders with panels", async () => {
    await setupPanelsAndRender({ sidebarEntries: { panels: [panel] } });

    expect(screen.getByText("Panel Test 1")).toBeInTheDocument();
  });

  describe("Mod Launcher", () => {
    jest.mocked(messengerApi.getReservedSidebarEntries).mockImplementation(
      () =>
        ({
          panels: [],
          temporaryPanels: [],
          forms: [],
          modActivationPanel: null,
        }) as any,
    );

    test("renders with mod launcher visible if there are no other visible mods", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          staticPanels: [MOD_LAUNCHER],
        },
      });

      expect(screen.getByRole("tab", { name: /mods/i })).toBeInTheDocument();
    });

    test("displays no active sidebar panels view when no panels are active", async () => {
      await setupPanelsAndRender({
        sidebarEntries: { staticPanels: [MOD_LAUNCHER] },
      });

      expect(
        screen.getByText("We didn't find any mods to run"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Don't worry, there's a solution"),
      ).toBeInTheDocument();
    });

    test("mod launcher is closed by default if there are other open panels", async () => {
      await setupPanelsAndRender({
        sidebarEntries: { staticPanels: [MOD_LAUNCHER], panels: [panel] },
      });

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();
    });

    test("can close the mod launcher", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      await userEvent.click(
        screen.getByRole("button", { name: "Open Mod Launcher" }),
      );

      expect(screen.getByText("Mods")).toBeInTheDocument();

      within(screen.getByRole("tab", { name: /mods/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /mods/i }),
      ).not.toBeInTheDocument();
    });

    test("can open the mod launcher", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      const modLauncherButton = screen.getByRole("button", {
        name: "Open Mod Launcher",
      });

      await userEvent.click(modLauncherButton);

      expect(screen.getByText("Mods")).toBeInTheDocument();

      // The + button should be not be visible until the mod launcher can be opened multiple times.
      // https://github.com/pixiebrix/pixiebrix-extension/issues/6549
      expect(modLauncherButton).not.toBeInTheDocument();
    });

    test("opening a panel from the mod launcher closes the mod launcher", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      await userEvent.click(
        screen.getByRole("button", { name: "Open Mod Launcher" }),
      );

      await userEvent.click(
        within(screen.getByRole("tab", { name: /panel test 1/i })).getByRole(
          "button",
          { name: "Close" },
        ),
      );

      expect(screen.getByText("Mods")).toBeInTheDocument();

      await userEvent.click(
        await screen.findByRole("heading", { name: /panel test 1/i }),
      );

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();
    });

    test("selecting another tab closes the mod launcher", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      await userEvent.click(
        screen.getByRole("button", { name: "Open Mod Launcher" }),
      );

      expect(screen.getByText("Mods")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("tab", { name: /panel test 1/i }));

      expect(screen.queryByText("Mods")).not.toBeInTheDocument();
    });
  });

  describe("Persistent Panels", () => {
    jest.mocked(messengerApi.getReservedSidebarEntries).mockImplementation(
      () =>
        ({
          panels: [],
          temporaryPanels: [],
          forms: [],
          modActivationPanel: null,
        }) as any,
    );

    test("can close a panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      within(screen.getByRole("tab", { name: /panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /panel test 1/i }),
      ).not.toBeInTheDocument();
    });

    test("can open a closed panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [panel, panel2],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      await userEvent.click(
        within(screen.getByRole("tab", { name: /panel test 1/i })).getByRole(
          "button",
          { name: "Close" },
        ),
      );

      expect(
        screen.queryByRole("tab", { name: /panel test 1/i }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Open Mod Launcher" }),
      );

      await userEvent.click(
        await screen.findByRole("heading", { name: /panel test 1/i }),
      );

      expect(
        screen.getByRole("tab", { name: /panel test 1/i }),
      ).toBeInTheDocument();
    });

    test("sidebar doesn't close if visible reserved panel available", async () => {
      hideSidebarSpy.mockReset();
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [],
        },
        reservedSidebarEntries: { panels: [panel] },
      });

      await waitForEffect();
      expect(hideSidebarSpy).toHaveBeenCalledTimes(0);
    });

    test("sidebar closes if no visible reserved panel available", async () => {
      hideSidebarSpy.mockReset();
      await setupPanelsAndRender({
        sidebarEntries: {
          panels: [],
        },
      });

      await waitFor(() => {
        expect(hideSidebarSpy).toHaveBeenCalledTimes(1);
      });
    });

    it("shows initial panel", async () => {
      await setupPanelsAndRender({
        // Force panel2 to be active panel. Otherwise the first panel is active
        initialModComponentRef: panel2.modComponentRef,
        sidebarEntries: {
          panels: [panel, panel2],
          staticPanels: [],
        },
      });

      expect(
        screen.getByRole("tab", { name: /panel test 1/i }),
      ).toHaveAttribute("aria-selected", "false");
      expect(
        screen.getByRole("tab", { name: /panel test 2/i }),
      ).toHaveAttribute("aria-selected", "true");
    });

    it("un-hides initial panel", async () => {
      await setupPanelsAndRender({
        // Force panel2 to be active panel. Otherwise the first panel is active
        initialModComponentRef: panel2.modComponentRef,
        initialClosedEntries: [panel, panel2],
        sidebarEntries: {
          panels: [panel, panel2],
          staticPanels: [],
        },
      });

      expect(
        screen.queryByRole("tab", { name: /panel test 1/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /panel test 2/i }),
      ).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Temporary Panels", () => {
    const temporaryPanel = sidebarEntryFactory("temporaryPanel");

    test("can close a temporary panel when mod launcher is available", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          temporaryPanels: [temporaryPanel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      await waitFor(() => {
        expect(
          screen.queryByRole("tab", { name: /temporary panel test 1/i }),
        ).not.toBeInTheDocument();
      });
    });

    test("can close a temporary panel when mod launcher is unavailable", async () => {
      await setupPanelsAndRender({
        sidebarEntries: { temporaryPanels: [temporaryPanel] },
      });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      await waitFor(() => {
        expect(
          screen.queryByRole("tab", { name: /temporary panel test 1/i }),
        ).not.toBeInTheDocument();
      });
    });

    test("cannot re-open a closed temporary panel with the mod launcher", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          temporaryPanels: [temporaryPanel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      within(screen.getByRole("tab", { name: /temporary panel test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      await waitFor(() => {
        expect(
          screen.queryByRole("tab", { name: /temporary panel test 1/i }),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.queryByRole("heading", { name: /temporary panel test 1/i }),
      ).not.toBeInTheDocument();
    });

    test("sidebar doesn't close if visible reserved panel available", async () => {
      hideSidebarSpy.mockReset();
      await setupPanelsAndRender({
        sidebarEntries: {
          temporaryPanels: [],
        },
        reservedSidebarEntries: { temporaryPanels: [temporaryPanel] },
      });

      await waitForEffect();
      expect(hideSidebarSpy).toHaveBeenCalledTimes(0);
    });

    test("sidebar closes if no visible reserved panel available", async () => {
      hideSidebarSpy.mockReset();
      await setupPanelsAndRender({
        sidebarEntries: {
          temporaryPanels: [],
        },
      });

      await waitFor(() => {
        expect(hideSidebarSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Form Panels", () => {
    const formPanel = sidebarEntryFactory("form");

    test("renders with forms", async () => {
      await setupPanelsAndRender({ sidebarEntries: { forms: [formPanel] } });

      expect(screen.getByText("Form Panel Test")).toBeInTheDocument();
    });

    test("closing the form tab calls cancelForm", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          forms: [formPanel],
          staticPanels: [MOD_LAUNCHER],
        },
      });

      expect(cancelFormSpy).not.toHaveBeenCalled();

      within(screen.getByRole("tab", { name: /form panel test/i }))
        .getByRole("button", { name: "Close" })
        .click();

      await waitFor(() => {
        expect(cancelFormSpy).toHaveBeenCalledWith(
          {
            frameId: 0,
            tabId: 1,
          },
          formPanel.nonce,
        );
      });
    });
  });

  describe("Activation Panels", () => {
    const activatePanel = sidebarEntryFactory("activateMods");

    test("closing the activation panel shows the mod launcher if it's the only open panel", async () => {
      await setupPanelsAndRender({
        sidebarEntries: {
          staticPanels: [MOD_LAUNCHER],
          modActivationPanel: activatePanel,
        },
        showModLauncher: false,
      });

      within(screen.getByRole("tab", { name: /activate mods test 1/i }))
        .getByRole("button", { name: "Close" })
        .click();

      expect(
        screen.queryByRole("tab", { name: /activate mods test 1/i }),
      ).not.toBeInTheDocument();

      await expect(
        screen.findByRole("tab", { name: /mods/i }),
      ).resolves.toBeInTheDocument();
    });
  });
});
