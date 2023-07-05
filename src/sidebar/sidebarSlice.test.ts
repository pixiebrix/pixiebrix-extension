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

import sidebarSlice, { fixActiveTabOnRemove } from "@/sidebar/sidebarSlice";
import { eventKeyForEntry } from "@/sidebar/utils";
import {
  cancelForm,
  cancelTemporaryPanel,
  closeTemporaryPanel,
} from "@/contentScript/messenger/api";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import type { SidebarState } from "@/types/sidebarTypes";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { uuidv4, validateRegistryId } from "@/types/helpers";

jest.mock("@/sidebar/messenger/api", () => ({
  // :shrug: imported via testUtils/factories
  renderPanels: jest.fn(),
}));

jest.mock("@/contentScript/messenger/api", () => ({
  closeTemporaryPanel: jest.fn().mockResolvedValue(undefined),
  cancelTemporaryPanel: jest.fn().mockResolvedValue(undefined),
  cancelForm: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/blocks/transformers/temporaryInfo/messenger/api", () => ({
  updateTemporaryPanel: jest.fn().mockResolvedValue(undefined),
}));

const cancelTemporaryPanelMock = jest.mocked(cancelTemporaryPanel);
const closeTemporaryPanelMock = jest.mocked(closeTemporaryPanel);
const cancelFormMock = jest.mocked(cancelForm);

beforeEach(() => {
  cancelTemporaryPanelMock.mockReset();
  closeTemporaryPanelMock.mockReset();
  cancelFormMock.mockReset();
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

  it("does not select a new tab when called with a stale key", () => {
    const firstPanel = sidebarEntryFactory("panel");
    const secondPanel = sidebarEntryFactory("panel");
    const activeKey = eventKeyForEntry(secondPanel);
    const staleKey = validateRegistryId("test/123");

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey,
      panels: [firstPanel, secondPanel],
    } as SidebarState;

    expect(state.activeKey).toBe(activeKey);

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.selectTab(staleKey)
    );
    expect(newState.activeKey).toBe(activeKey);
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

  it("sets activeKey to a panel with the same extensionId if it exists", () => {
    const originalPanel = sidebarEntryFactory("panel", {
      extensionId: uuidv4(),
    });
    const otherExistingPanel = sidebarEntryFactory("form", {
      extensionId: uuidv4(),
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId: originalPanel.extensionId,
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    const intermediateState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.addTemporaryPanel({ panel: newPanel })
    );

    const newState = sidebarSlice.reducer(
      intermediateState,
      sidebarSlice.actions.removeTemporaryPanel(newPanel.nonce)
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(originalPanel));
  });
});

describe("sidebarSlice.addForm", () => {
  it("adds form to empty state", async () => {
    const state = sidebarSlice.getInitialState();

    const extensionId = autoUUIDSequence();

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.addForm({
        form: {
          type: "form",
          extensionId,
          blueprintId: validateRegistryId("test/123"),
          nonce: autoUUIDSequence(),
          form: {
            schema: {
              title: "Form Title",
            },
            uiSchema: {},
            cancelable: false,
            submitCaption: "Submit",
            location: "sidebar",
          },
        },
      })
    );

    await tick();

    expect(newState.forms).toHaveLength(1);
    expect(cancelFormMock).toHaveBeenCalledExactlyOnceWith({
      frameId: 0,
      tabId: 1,
    });
  });
});

describe("sidebarSlice.fixActiveTabOnRemove", () => {
  it("sets activeKey to the active key of any panel with the same extensionId as the removedEntry if it exists", () => {
    const modId = validateRegistryId("test/123");
    const originalPanel = sidebarEntryFactory("panel", {
      extensionId: uuidv4(),
      blueprintId: modId,
    });
    const otherExistingPanel = sidebarEntryFactory("form", {
      extensionId: uuidv4(),
      blueprintId: modId,
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId: originalPanel.extensionId,
      blueprintId: modId,
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    // @ts-expect-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
    fixActiveTabOnRemove(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(originalPanel),
    });
  });

  it("sets activeKey to the active key of any panel with the same modId as the removedEntry if it exists and there is no matching extensionId", () => {
    const modId = validateRegistryId("test/123");

    const firstPanel = sidebarEntryFactory("panel", {
      extensionId: uuidv4(),
    });
    const matchingPanel = sidebarEntryFactory("panel", {
      extensionId: uuidv4(),
      blueprintId: modId,
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId: uuidv4(),
      blueprintId: modId,
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      panels: [firstPanel, matchingPanel],
      temporaryPanels: [],
    } as SidebarState;

    // @ts-expect-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
    fixActiveTabOnRemove(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(matchingPanel),
    });
  });

  it("does not set the activeKey to the active key of a panel when both modIds are null", () => {
    const extensionId = uuidv4();

    const originalPanel = sidebarEntryFactory("panel", {
      extensionId,
    });
    const firstFormPanel = sidebarEntryFactory("form", {
      extensionId,
    });
    const nullModId = sidebarEntryFactory("form", {
      extensionId,
      blueprintId: null,
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId,
      blueprintId: null,
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [firstFormPanel, nullModId],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    // @ts-expect-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
    fixActiveTabOnRemove(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(firstFormPanel),
    });
  });

  it("sets activeKey to the defaultEventKey if no panel with the same extensionId as the removedEntry exists", () => {
    const originalPanel = sidebarEntryFactory("panel", {
      extensionId: uuidv4(),
    });
    const otherExistingPanel = sidebarEntryFactory("form", {
      extensionId: uuidv4(),
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      extensionId: uuidv4(),
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    // @ts-expect-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
    fixActiveTabOnRemove(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(otherExistingPanel),
    });
  });
});
