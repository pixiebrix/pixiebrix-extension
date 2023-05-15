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

import sidebarSlice from "@/sidebar/sidebarSlice";
import { eventKeyForEntry } from "@/sidebar/utils";
import {
  cancelTemporaryPanel,
  closeTemporaryPanel,
} from "@/contentScript/messenger/api";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { type SidebarState } from "@/sidebar/types";

jest.mock("@/sidebar/messenger/api", () => ({
  // :shrug: imported via testUtils/factories
  renderPanels: jest.fn(),
}));

jest.mock("@/contentScript/messenger/api", () => ({
  closeTemporaryPanel: jest.fn().mockResolvedValue(undefined),
  cancelTemporaryPanel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/blocks/transformers/temporaryInfo/messenger/api", () => ({
  updateTemporaryPanel: jest.fn().mockResolvedValue(undefined),
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
    const entry = sidebarEntryFactory("temporaryPanel");

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [entry],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.selectTab(eventKeyForEntry(entry))
    );
    expect(newState.activeKey).toBe(eventKeyForEntry(entry));
  });
});

describe("sidebarSlice.addTemporaryPanel", () => {
  it("cancels existing temporary panel for extension", async () => {
    const existingPanel = sidebarEntryFactory("temporaryPanel");
    const otherExistingPanel = sidebarEntryFactory("temporaryPanel");
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId: existingPanel.extensionId,
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [existingPanel, otherExistingPanel],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.addTemporaryPanel({ panel: newPanel })
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(newPanel));

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
    const activePanel = sidebarEntryFactory("temporaryPanel");
    const otherPanel = sidebarEntryFactory("temporaryPanel");

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [activePanel, otherPanel],
      activeKey: eventKeyForEntry(activePanel),
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.removeTemporaryPanel(activePanel.nonce)
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(otherPanel));

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
