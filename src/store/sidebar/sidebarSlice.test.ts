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

import sidebarSlice, {
  fixActiveTabOnRemoveInPlace,
} from "@/store/sidebar/sidebarSlice";
import { eventKeyForEntry } from "@/store/sidebar/eventKeyUtils";
import {
  cancelForm,
  cancelTemporaryPanel,
  closeTemporaryPanel,
} from "@/contentScript/messenger/api";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import type { SidebarState } from "@/types/sidebarTypes";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";
import { type Draft } from "immer";

import { configureStore } from "@reduxjs/toolkit";
import addFormPanel from "@/store/sidebar/thunks/addFormPanel";
import addTemporaryPanel from "@/store/sidebar/thunks/addTemporaryPanel";
import removeTemporaryPanel from "@/store/sidebar/thunks/removeTemporaryPanel";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";

jest.mock("@/sidebar/messenger/api");
jest.mock("@/contentScript/messenger/api");
jest.mock("@/bricks/transformers/temporaryInfo/messenger/api");

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
      sidebarSlice.actions.selectTab("unknown"),
    );
    expect(newState.activeKey).toBeUndefined();
  });

  it("selects temporary panel", () => {
    const entry = sidebarEntryFactory("temporaryPanel");

    const state = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [entry],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.selectTab(eventKeyForEntry(entry)),
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
      sidebarSlice.actions.selectTab(staleKey),
    );
    expect(newState.activeKey).toBe(activeKey);
  });
});

describe("sidebarSlice.addTemporaryPanel", () => {
  it("cancels existing temporary panel for extension", async () => {
    const existingPanel = sidebarEntryFactory("temporaryPanel");
    const otherExistingPanel = sidebarEntryFactory("temporaryPanel");
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      modComponentRef: modComponentRefFactory({
        modComponentId: existingPanel.modComponentRef.modComponentId,
      }),
    });

    const initialState: SidebarState = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [existingPanel, otherExistingPanel],
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Flaky error
    // @ts-ignore-error "Type instantiation is excessively deep and possibly infinite"
    const store = configureStore({
      reducer: { sidebar: sidebarSlice.reducer },
      preloadedState: { sidebar: initialState },
    });

    await store.dispatch(addTemporaryPanel({ panel: newPanel }));

    const { temporaryPanels, activeKey } = store.getState().sidebar;

    expect(temporaryPanels).toHaveLength(2);
    expect(temporaryPanels).toStrictEqual([otherExistingPanel, newPanel]);
    expect(activeKey).toBe(eventKeyForEntry(newPanel));
    expect(cancelTemporaryPanelMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 1,
      },
      // Only the panel with the same extensionId should be cancelled
      [existingPanel.nonce],
    );
  });

  it("closes the mod launcher if it is open", async () => {
    const newPanel = sidebarEntryFactory("temporaryPanel");

    const initialState: SidebarState = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [],
      staticPanels: [MOD_LAUNCHER],
    };

    const store = configureStore({
      reducer: { sidebar: sidebarSlice.reducer },
      preloadedState: { sidebar: initialState },
    });

    expect(store.getState().sidebar.closedTabs).toStrictEqual({});

    await store.dispatch(addTemporaryPanel({ panel: newPanel }));

    const { activeKey, closedTabs } = store.getState().sidebar;

    expect(activeKey).toBe(eventKeyForEntry(newPanel));
    expect(closedTabs).toStrictEqual({
      [eventKeyForEntry(MOD_LAUNCHER)]: true,
    });
  });
});

describe("removeTemporaryPanel", () => {
  it("removes active temporary panel", async () => {
    const activePanel = sidebarEntryFactory("temporaryPanel");
    const otherPanel = sidebarEntryFactory("temporaryPanel");

    const initialState: SidebarState = {
      ...sidebarSlice.getInitialState(),
      temporaryPanels: [activePanel, otherPanel],
      activeKey: eventKeyForEntry(activePanel),
    };

    const store = configureStore({
      reducer: { sidebar: sidebarSlice.reducer },
      preloadedState: { sidebar: initialState },
    });

    await store.dispatch(removeTemporaryPanel(activePanel.nonce));

    const { activeKey, temporaryPanels } = store.getState().sidebar;

    expect(activeKey).toBe(eventKeyForEntry(otherPanel));
    expect(temporaryPanels).toHaveLength(1);
    expect(temporaryPanels).toStrictEqual([otherPanel]);
    expect(closeTemporaryPanelMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 1,
      },
      [activePanel.nonce],
    );
  });

  it("sets activeKey to a panel with the same mod component id if it exists", async () => {
    const originalPanel = sidebarEntryFactory("panel");
    const otherExistingPanel = sidebarEntryFactory("form");
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      modComponentRef: modComponentRefFactory({
        modComponentId: originalPanel.modComponentRef.modComponentId,
      }),
    });

    const initialState: SidebarState = {
      ...sidebarSlice.getInitialState(),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    };

    const store = configureStore({
      reducer: { sidebar: sidebarSlice.reducer },
      preloadedState: { sidebar: initialState },
    });

    await store.dispatch(addTemporaryPanel({ panel: newPanel }));
    await store.dispatch(removeTemporaryPanel(newPanel.nonce));

    const { activeKey } = store.getState().sidebar;
    expect(activeKey).toBe(eventKeyForEntry(originalPanel));
  });
});

describe("sidebar thunk addFormPanel", () => {
  it("adds form to empty state", async () => {
    const store = configureStore({
      reducer: { sidebar: sidebarSlice.reducer },
    });

    const form = sidebarEntryFactory("form");

    await store.dispatch(addFormPanel({ form }));

    const { forms, activeKey } = store.getState().sidebar;

    expect(forms).toHaveLength(1);
    expect(forms).toStrictEqual([form]);
    expect(activeKey).toBe(eventKeyForEntry(form));
    expect(cancelFormMock).toHaveBeenCalledExactlyOnceWith({
      frameId: 0,
      tabId: 1,
    });
  });
});

describe("sidebarSlice.showModActivationPanel", () => {
  it("closes the mod launcher if it is open", async () => {
    const newPanel = sidebarEntryFactory("activateMods");

    const state = {
      ...sidebarSlice.getInitialState(),
      staticPanels: [MOD_LAUNCHER],
    } as SidebarState;

    expect(state.closedTabs).toStrictEqual({});

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.showModActivationPanel(newPanel),
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(newPanel));

    expect(newState.closedTabs).toStrictEqual({
      [eventKeyForEntry(MOD_LAUNCHER)]: true,
    });
  });
});

describe("sidebarSlice.hideModActivationPanel", () => {
  it("switches the active panel", async () => {
    const modActivationPanel = sidebarEntryFactory("activateMods");
    const nextPanel = sidebarEntryFactory("panel");

    const state = {
      ...sidebarSlice.getInitialState(),
      staticPanels: [MOD_LAUNCHER],
      panels: [nextPanel],
      modActivationPanel,
      closedTabs: { [eventKeyForEntry(MOD_LAUNCHER)]: true },
      activeKey: eventKeyForEntry(modActivationPanel),
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.hideModActivationPanel(),
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(nextPanel));

    expect(newState.closedTabs).toStrictEqual({
      [eventKeyForEntry(MOD_LAUNCHER)]: true,
    });
  });

  it("switches to the mod launcher if there are no other visible panels", async () => {
    const modActivationPanel = sidebarEntryFactory("activateMods");

    const state = {
      ...sidebarSlice.getInitialState(),
      staticPanels: [MOD_LAUNCHER],
      modActivationPanel,
      closedTabs: { [eventKeyForEntry(MOD_LAUNCHER)]: true },
      activeKey: eventKeyForEntry(modActivationPanel),
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.hideModActivationPanel(),
    );

    expect(newState.activeKey).toBe(eventKeyForEntry(MOD_LAUNCHER));

    expect(newState.closedTabs).toStrictEqual({
      [eventKeyForEntry(MOD_LAUNCHER)]: false,
    });
  });
});

describe("closed tabs", () => {
  const panel = sidebarEntryFactory("panel", { heading: "Test Panel" });
  const panelKey = eventKeyForEntry(panel);
  const modLauncherKey = eventKeyForEntry(MOD_LAUNCHER);

  it("closes the tab and opens the mod launcher if there are no other visible tabs", () => {
    const state = {
      ...sidebarSlice.getInitialState(),
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.closeTab(panelKey),
    );

    expect(newState).toStrictEqual({
      ...state,
      closedTabs: { [panelKey]: true, [modLauncherKey]: false },
    });
  });

  it("closing the mod launcher does not open the mod launcher", () => {
    const state = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [modLauncherKey]: false },
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.closeTab(modLauncherKey),
    );

    expect(newState).toStrictEqual({
      ...state,
      closedTabs: { [modLauncherKey]: true },
    });
  });

  it("closes the tab but does not open the mod launcher if there are other visible tabs", () => {
    const otherPanel = sidebarEntryFactory("panel");

    const state = {
      ...sidebarSlice.getInitialState(),
      panels: [otherPanel],
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.closeTab(panelKey),
    );

    expect(newState).toStrictEqual({
      ...state,
      closedTabs: { [panelKey]: true },
    });
  });

  it("open tab", () => {
    const state = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: true },
    } as SidebarState;

    const newState = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.openTab(panelKey),
    );

    expect(newState).toStrictEqual({
      ...state,
      closedTabs: { [panelKey]: false },
    });
  });

  it("activatePanel reopens tab", () => {
    const state = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: true },
      panels: [panel],
    } as SidebarState;

    const stateWithActivatedPanel = sidebarSlice.reducer(
      state,
      sidebarSlice.actions.activatePanel({
        panelHeading: "Test Panel",
        force: true,
      }),
    );

    // Ensure sure correct panels are visible
    expect(stateWithActivatedPanel.closedTabs).toStrictEqual({
      [panelKey]: false,
    });

    // Ensure panel is the active tab
    expect(stateWithActivatedPanel.activeKey).toBe(panelKey);
  });

  it("setInitialPanels opens mod launcher if there are no visible panels", () => {
    const initialState = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: true, [modLauncherKey]: true },
    };

    const stateWithInitialPanels = sidebarSlice.reducer(
      initialState,
      sidebarSlice.actions.setInitialPanels({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
        forms: [],
        temporaryPanels: [],
        modActivationPanel: null,
      }),
    );

    // Ensure sure correct panels are visible
    expect(stateWithInitialPanels.closedTabs).toStrictEqual({
      [panelKey]: true,
      [modLauncherKey]: false,
    });

    // Ensure mod launcher is the active tab
    expect(stateWithInitialPanels.activeKey).toBe(modLauncherKey);
  });

  it("setInitialPanels doesn't open mod launcher if there are visible panels", () => {
    const panel = sidebarEntryFactory("panel", { heading: "Test Panel" });
    const panelKey = eventKeyForEntry(panel);
    const modLauncherKey = eventKeyForEntry(MOD_LAUNCHER);

    const initialState = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: false, [modLauncherKey]: true },
    };

    const stateWithInitialPanels = sidebarSlice.reducer(
      initialState,
      sidebarSlice.actions.setInitialPanels({
        panels: [panel],
        staticPanels: [MOD_LAUNCHER],
        forms: [],
        temporaryPanels: [],
        modActivationPanel: null,
      }),
    );

    expect(stateWithInitialPanels.closedTabs).toStrictEqual({
      [panelKey]: false,
      [modLauncherKey]: true,
    });

    expect(stateWithInitialPanels.activeKey).toBe(panelKey);
  });

  it("activatePanel closes mod launcher tab if there's another active panel", () => {
    const panel = sidebarEntryFactory("panel", { heading: "Test Panel" });
    const panelKey = eventKeyForEntry(panel);
    const modLauncherKey = eventKeyForEntry(MOD_LAUNCHER);

    const initialState = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: true, [modLauncherKey]: false },
      panels: [panel],
      staticPanels: [MOD_LAUNCHER],
    };

    const stateWithActivePanel = sidebarSlice.reducer(
      initialState,
      sidebarSlice.actions.activatePanel({
        panelHeading: "Test Panel",
        force: true,
      }),
    );

    expect(stateWithActivePanel.closedTabs).toStrictEqual({
      [panelKey]: false,
      [modLauncherKey]: true,
    });
    expect(stateWithActivePanel.activeKey).toBe(panelKey);
  });

  it("activatePanel doesn't close mod launcher tab if there's no other open tab", () => {
    const panel = sidebarEntryFactory("panel", { heading: "Test Panel" });
    const panelKey = eventKeyForEntry(panel);
    const modLauncherKey = eventKeyForEntry(MOD_LAUNCHER);

    const initialState = {
      ...sidebarSlice.getInitialState(),
      closedTabs: { [panelKey]: false, [modLauncherKey]: false },
      panels: [panel],
      staticPanels: [MOD_LAUNCHER],
    };

    const stateWithActivePanel = sidebarSlice.reducer(
      initialState,
      sidebarSlice.actions.activatePanel({
        panelHeading: "Test Panel",
        force: true,
      }),
    );

    // After activatePanel, if there is only one other tab open, the mod launcher should be closed
    expect(stateWithActivePanel.closedTabs).toStrictEqual({
      [panelKey]: false,
      [modLauncherKey]: false,
    });
    expect(stateWithActivePanel.activeKey).toBe(panelKey);
  });
});

describe("sidebarSlice.fixActiveTabOnRemove", () => {
  it("sets activeKey to the active key of any panel with the same extensionId as the removedEntry if it exists", () => {
    const modId = validateRegistryId("test/123");
    const originalPanel = sidebarEntryFactory("panel", {
      modComponentRef: modComponentRefFactory({
        modId,
      }),
    });
    const otherExistingPanel = sidebarEntryFactory("form", {
      modComponentRef: modComponentRefFactory({
        modId,
      }),
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      modComponentRef: modComponentRefFactory({
        modComponentId: originalPanel.modComponentRef.modComponentId,
        modId,
      }),
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    } as Draft<SidebarState>;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Flaky error
    // @ts-ignore-error "Type instantiation is excessively deep and possibly infinite"
    fixActiveTabOnRemoveInPlace(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(originalPanel),
    });
  });

  it("sets activeKey to the active key of any panel with the same modId as the removedEntry if it exists and there is no matching component id", () => {
    const modId = validateRegistryId("test/123");

    const firstPanel = sidebarEntryFactory("panel");
    const matchingPanel = sidebarEntryFactory("panel", {
      modComponentRef: modComponentRefFactory({
        modId,
      }),
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      modComponentRef: modComponentRefFactory({
        modId,
      }),
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      panels: [firstPanel, matchingPanel],
      temporaryPanels: [],
    } as SidebarState;

    fixActiveTabOnRemoveInPlace(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(matchingPanel),
    });
  });

  it("does not set the activeKey to the active key of a panel with matching modId when both modIds are null", () => {
    const extensionId = uuidv4();

    const originalPanel = sidebarEntryFactory("panel", {
      modComponentRef: modComponentRefFactory({
        modComponentId: extensionId,
      }),
    });
    const firstFormPanel = sidebarEntryFactory("form", {
      modComponentRef: modComponentRefFactory({
        modComponentId: extensionId,
      }),
    });
    const undefinedModId = sidebarEntryFactory("form", {
      modComponentRef: modComponentRefFactory({
        modComponentId: extensionId,
        modId: undefined,
      }),
    });
    const newPanel = sidebarEntryFactory("temporaryPanel", {
      modComponentRef: modComponentRefFactory({
        modComponentId: extensionId,
        modId: undefined,
      }),
    });

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [firstFormPanel, undefinedModId],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    fixActiveTabOnRemoveInPlace(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(firstFormPanel),
    });
  });

  it("sets activeKey to the defaultEventKey if no panel with the same extensionId as the removedEntry exists", () => {
    const originalPanel = sidebarEntryFactory("panel");
    const otherExistingPanel = sidebarEntryFactory("form");
    const newPanel = sidebarEntryFactory("temporaryPanel");

    const state = {
      ...sidebarSlice.getInitialState(),
      activeKey: eventKeyForEntry(newPanel),
      forms: [otherExistingPanel],
      panels: [originalPanel],
      temporaryPanels: [],
    } as SidebarState;

    fixActiveTabOnRemoveInPlace(state, newPanel);

    expect(state).toStrictEqual({
      ...state,
      activeKey: eventKeyForEntry(otherExistingPanel),
    });
  });
});
