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

import sidebarSlice, { type SidebarState } from "@/sidebar/sidebarSlice";
import { uuidSequence } from "@/testUtils/factories";
import { mapTabEventKey } from "@/sidebar/utils";
import {
  cancelTemporaryPanel,
  closeTemporaryPanel,
} from "@/contentScript/messenger/api";
import { type TemporaryPanelEntry } from "@/sidebar/types";
import { uuidv4 } from "@/types/helpers";
import { tick } from "@/extensionPoints/extensionPointTestUtils";

jest.mock("@/sidebar/messenger/api", () => ({
  // :shrug: imported via testUtils/factories
  renderPanels: jest.fn(),
}));

jest.mock("@/background/messenger/api", () => ({
  // :shrug: imported via testUtils/factories
  getAvailableVersion: jest.fn(),
}));

jest.mock("webext-messenger", () => ({
  getTopLevelFrame: jest.fn().mockResolvedValue({
    tabId: 1,
    frameId: 0,
  }),
}));

jest.mock("@/contentScript/messenger/api", () => ({
  closeTemporaryPanel: jest.fn().mockResolvedValue(undefined),
  cancelTemporaryPanel: jest.fn().mockResolvedValue(undefined),
}));

const cancelTemporaryPanelMock = cancelTemporaryPanel as jest.MockedFunction<
  typeof cancelTemporaryPanel
>;
const closeTemporaryPanelMock = closeTemporaryPanel as jest.MockedFunction<
  typeof closeTemporaryPanel
>;

beforeEach(() => {
  cancelTemporaryPanelMock.mockReset();
  closeTemporaryPanelMock.mockReset();
});

describe("sidebarSlice.selectTab", () => {
  it("handles unknown select tab", () => {
    const state = sidebarSlice.getInitialState();
    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.selectTab("unknown")
    );
    expect(newState.activeKey).toBe(null);
  });

  it("selects temporary panel", () => {
    const panel = { nonce: uuidSequence(0), extensionId: uuidSequence(1) };

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [panel],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.selectTab(mapTabEventKey("temporaryPanel", panel))
    );
    expect(newState.activeKey).toBe(mapTabEventKey("temporaryPanel", panel));
  });
});

describe("sidebarSlice.addTemporaryPanel", () => {
  it("cancels existing temporary panel", async () => {
    const existingPanel = { nonce: uuidv4(), extensionId: uuidv4() };
    const otherExistingPanel = { nonce: uuidv4(), extensionId: uuidv4() };
    const newPanel: TemporaryPanelEntry = {
      nonce: uuidv4(),
      extensionId: existingPanel.extensionId,
      heading: "Test",
      payload: {} as any,
    };

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [existingPanel, otherExistingPanel],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.addTemporaryPanel({ panel: newPanel })
    );

    expect(newState.activeKey).toBe(mapTabEventKey("temporaryPanel", newPanel));

    // Wait for the async call to be processed
    await tick();

    expect(cancelTemporaryPanelMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 1,
      },
      // Only the panel with the same extensionId should be cancelled
      [existingPanel.nonce]
    );
  });
});

describe("sidebarSlice.removeTemporaryPanel", () => {
  it("removes active temporary panel", async () => {
    const activePanel = { nonce: uuidv4(), extensionId: uuidv4() };
    const otherPanel = { nonce: uuidv4(), extensionId: uuidv4() };

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [activePanel, otherPanel],
      activeKey: mapTabEventKey("temporaryPanel", activePanel),
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.removeTemporaryPanel(activePanel.nonce)
    );

    expect(newState.activeKey).toBe(
      mapTabEventKey("temporaryPanel", otherPanel)
    );

    // Wait for the async call to be processed
    await tick();

    expect(closeTemporaryPanelMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 1,
      },
      [activePanel.nonce]
    );
  });
});
