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

import type {
  FormPanelEntry,
  PanelEntry,
  ActivatePanelOptions,
  TemporaryPanelEntry,
  ModActivationPanelEntry,
  SidebarEntry,
  SidebarState,
  StaticPanelEntry,
} from "@/types/sidebarTypes";
import {
  type ActionReducerMapBuilder,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { type UUID } from "@/types/stringTypes";
import {
  defaultEventKey,
  eventKeyForEntry,
} from "@/store/sidebar/eventKeyUtils";
import { remove, sortBy } from "lodash";
import { castDraft } from "immer";
import { getVisiblePanelCount } from "@/store/sidebar/utils";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";
import { type Nullishable } from "@/utils/nullishUtils";
import addFormPanel from "@/store/sidebar/thunks/addFormPanel";
import addTemporaryPanel from "@/store/sidebar/thunks/addTemporaryPanel";
import removeTemporaryPanel from "@/store/sidebar/thunks/removeTemporaryPanel";
import resolveTemporaryPanel from "@/store/sidebar/thunks/resolveTemporaryPanel";
import { initialSidebarState } from "@/store/sidebar/initialState";
import removeFormPanel from "@/store/sidebar/thunks/removeFormPanel";

function eventKeyExists(
  state: SidebarState,
  query: Nullishable<string>,
): boolean {
  if (query == null) {
    return false;
  }

  return (
    state.forms.some((x) => eventKeyForEntry(x) === query) ||
    state.temporaryPanels.some((x) => eventKeyForEntry(x) === query) ||
    state.panels.some((x) => eventKeyForEntry(x) === query) ||
    state.staticPanels.some((x) => eventKeyForEntry(x) === query) ||
    eventKeyForEntry(state.modActivationPanel) === query
  );
}

function findNextActiveKey(
  state: SidebarState,
  { extensionId, blueprintId, panelHeading }: ActivatePanelOptions,
): string | null {
  // Try matching on extension
  if (extensionId) {
    // Prefer form to panel -- however, it would be unusual to target an ephemeral form when reshowing the sidebar
    const extensionForm = state.forms.find(
      (x) => x.modComponentRef.extensionId === extensionId,
    );
    if (extensionForm) {
      return eventKeyForEntry(extensionForm);
    }

    const extensionTemporaryPanel = state.temporaryPanels.find(
      (x) => x.modComponentRef.extensionId === extensionId,
    );
    if (extensionTemporaryPanel) {
      return eventKeyForEntry(extensionTemporaryPanel);
    }

    const extensionPanel = state.panels.find(
      (x) => x.modComponentRef.extensionId === extensionId,
    );
    if (extensionPanel) {
      return eventKeyForEntry(extensionPanel);
    }
  }

  // Try matching on panel heading
  if (panelHeading) {
    const extensionPanel = state.panels
      .filter(
        (x) =>
          blueprintId == null || x.modComponentRef.blueprintId === blueprintId,
      )
      .find((x) => x.heading === panelHeading);
    if (extensionPanel) {
      return eventKeyForEntry(extensionPanel);
    }
  }

  // Try matching on blueprint
  if (blueprintId) {
    const blueprintPanel = state.panels.find(
      (x) => x.modComponentRef.blueprintId === blueprintId,
    );
    if (blueprintPanel) {
      return eventKeyForEntry(blueprintPanel);
    }
  }

  // Return the first static panel, if it exists
  if (state.staticPanels[0]) {
    return eventKeyForEntry(state.staticPanels[0]);
  }

  return null;
}

/**
 * Updates activeKey in place based on a removed entry. Mutates the state object.
 */
export function fixActiveTabOnRemoveInPlace(
  state: SidebarState,
  removedEntry: Nullishable<SidebarEntry>,
): void {
  // Only update the active panel if the panel needs to change
  if (removedEntry && state.activeKey === eventKeyForEntry(removedEntry)) {
    const panels = [...state.forms, ...state.panels, ...state.temporaryPanels];

    const matchingExtension = panels.find(
      ({ modComponentRef: { extensionId } }) =>
        "modComponentRef" in removedEntry &&
        extensionId === removedEntry.modComponentRef.extensionId,
    );

    if (matchingExtension) {
      state.activeKey = eventKeyForEntry(matchingExtension);
    } else {
      // No mod component match, try finding another panel for the mod

      const matchingMod = panels.find(
        ({ modComponentRef: { blueprintId } }) =>
          "modComponentRef" in removedEntry &&
          blueprintId === removedEntry.modComponentRef.blueprintId &&
          // Require blueprintId to avoid switching between panels of standalone mod components
          blueprintId,
      );

      if (matchingMod) {
        state.activeKey = eventKeyForEntry(matchingMod);
      } else {
        state.activeKey = defaultEventKey(state, state.closedTabs);
      }
    }
  }
}

const sidebarSlice = createSlice({
  initialState: initialSidebarState,
  name: "sidebar",
  reducers: {
    setInitialPanels(
      state,
      action: PayloadAction<{
        staticPanels: StaticPanelEntry[];
        panels: PanelEntry[];
        temporaryPanels: TemporaryPanelEntry[];
        forms: FormPanelEntry[];
        modActivationPanel: ModActivationPanelEntry | null;
      }>,
    ) {
      /**
       * We need a visible count > 1 to prevent useHideEmptySidebar from closing it on first load. If there are no visible panels,
       * we'll show mod launcher. activatePanel then hides the modLauncher if there is another visible panel.
       * @see useHideEmptySidebar
       * @see activatePanel
       */
      const visiblePanelCount = getVisiblePanelCount({
        ...state,
        ...action.payload,
      });
      if (visiblePanelCount === 0) {
        state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = false;
      } else if (visiblePanelCount > 1) {
        // If there are other visible panels, hide the mod launcher
        state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = true;
      }

      state.staticPanels = castDraft(action.payload.staticPanels);
      state.forms = castDraft(action.payload.forms);
      state.panels = castDraft(action.payload.panels);
      state.temporaryPanels = castDraft(action.payload.temporaryPanels);
      state.modActivationPanel = castDraft(action.payload.modActivationPanel);
      state.activeKey =
        visiblePanelCount === 0
          ? eventKeyForEntry(MOD_LAUNCHER)
          : /* eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
            -- Immer Draft<T> type resolution can't handle JsonObject (recursive) types properly
            See: https://github.com/immerjs/immer/issues/839 */
            // @ts-ignore-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
            defaultEventKey(state, state.closedTabs);
    },
    selectTab(state, action: PayloadAction<string>) {
      // We were seeing some automatic calls to selectTab with a stale event key...
      // Calling selectTab with a stale event key shouldn't change the current tab
      if (eventKeyExists(state, action.payload)) {
        state.activeKey = action.payload;
        state.closedTabs[action.payload] = false;
      }

      // User manually selected a panel, so cancel any pending automatic panel activation
      state.pendingActivePanel = null;
    },
    removeForm(state, action: PayloadAction<UUID>) {
      const nonce = action.payload;

      const entry = remove(state.forms, (form) => form.nonce === nonce)[0];

      fixActiveTabOnRemoveInPlace(state, entry);
    },
    invalidatePanels(state) {
      for (const panel of state.panels) {
        // Regular panels are invalidated when the content script has emitted the notifyNavigationComplete event,
        // and they are still in `connecting` state (meaning that the mod did not mount for the new page)
        panel.isUnavailable = false;
        panel.isConnecting = true;
      }

      for (const form of state.forms) {
        form.isUnavailable = true;
      }

      for (const temporaryPanel of state.temporaryPanels) {
        temporaryPanel.isUnavailable = true;
      }
    },
    invalidateConnectingPanels(state) {
      for (const panel of state.panels) {
        if (panel.isConnecting) {
          panel.isConnecting = false;
          panel.isUnavailable = true;
        }
      }
    },
    updateTemporaryPanel(
      state,
      action: PayloadAction<{ panel: TemporaryPanelEntry }>,
    ) {
      const { panel } = action.payload;

      const index = state.temporaryPanels.findIndex(
        (x) => x.nonce === panel.nonce,
      );
      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- index from findIndex
        state.temporaryPanels[index] = castDraft(panel);
      }
    },

    // In the future, we might want to have ActivatePanelOptions support a "enqueue" prop for controlling whether the
    // or not a miss here is queued. We added pendingActivePanel to handle race condition on the initial sidebar
    // loading. If we always set pendingActivePanel though, can hit a weird corner cases where a panel is activated
    // significantly after the initial request.
    activatePanel(state, { payload }: PayloadAction<ActivatePanelOptions>) {
      state.pendingActivePanel = null;
      const hasActive = state.forms.length > 0 || state.panels.length > 0;

      if (hasActive && !payload.force) {
        return;
      }

      // We don't want to show an empty sidebar. setInitialPanels will set the active tab to the mod launcher if there
      // are no visible panels. This next logic will hide the mod launcher if it's the only visible panel, which will
      // be replaced by the newly activated panel.
      const visiblePanelCount = getVisiblePanelCount(state);
      if (
        visiblePanelCount === 1 &&
        !state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)]
      ) {
        state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = true;
      }

      const next = findNextActiveKey(state, payload);

      if (next) {
        state.activeKey = next;
        // Make sure the tab isn't closed
        // eslint-disable-next-line security/detect-object-injection -- next is not user-controlled
        state.closedTabs[next] = false;
      } else {
        state.pendingActivePanel = payload;
      }
    },
    setPanels(state, action: PayloadAction<{ panels: PanelEntry[] }>) {
      // Keep any old panels from state.panels that are unavailable or connecting and not in the new panels
      const oldPanels = state.panels.filter(
        (oldPanel) =>
          (oldPanel.isUnavailable || oldPanel.isConnecting) &&
          !action.payload.panels.some(
            (newPanel) =>
              newPanel.modComponentRef.extensionId ===
              oldPanel.modComponentRef.extensionId,
          ),
      );

      // For now, pick an arbitrary order that's stable. There's no guarantees on which order panels are registered
      state.panels = sortBy(
        [...oldPanels, ...castDraft(action.payload.panels)],
        (panel) => panel.modComponentRef.extensionId,
      );

      // Try fulfilling the pendingActivePanel request
      if (state.pendingActivePanel) {
        const next = findNextActiveKey(state, state.pendingActivePanel);
        if (next) {
          state.activeKey = next;
          state.pendingActivePanel = null;
          return;
        }
      }

      // If a panel is no longer available, reset the current tab to a valid tab.
      if (!eventKeyExists(state, state.activeKey)) {
        state.activeKey = defaultEventKey(state, state.closedTabs);
      }
    },
    showModActivationPanel(
      state,
      action: PayloadAction<ModActivationPanelEntry>,
    ) {
      const entry = action.payload;
      state.modActivationPanel = entry;
      state.activeKey = eventKeyForEntry(entry);
      state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = true;
    },
    hideModActivationPanel(state) {
      // We don't need to pass in an id to this action, because the can only be one active mod activation panel at a time
      const { modActivationPanel: entry, closedTabs } = state;
      state.modActivationPanel = null;

      if (getVisiblePanelCount(state) === 0) {
        closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = false;
      }

      fixActiveTabOnRemoveInPlace(state, entry);
    },
    closeTab(state, action: PayloadAction<string>) {
      state.closedTabs[action.payload] = true;

      const modLauncherEventKey = eventKeyForEntry(MOD_LAUNCHER);
      if (
        getVisiblePanelCount(state) === 0 &&
        action.payload !== modLauncherEventKey
      ) {
        state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = false;
      }

      if (state.activeKey === action.payload) {
        state.activeKey = defaultEventKey(state, state.closedTabs);
      }
    },
    openTab(state, action: PayloadAction<string>) {
      state.closedTabs[action.payload] = false;
    },
  },
  extraReducers(builder: ActionReducerMapBuilder<SidebarState>) {
    builder
      .addCase(addFormPanel.fulfilled, (state, action) => {
        if (action.payload) {
          const { forms, newForm } = action.payload;

          state.forms = castDraft(forms);
          state.activeKey = eventKeyForEntry(newForm);
        }
      })
      .addCase(removeFormPanel.fulfilled, (state, action) => {
        if (action.payload) {
          const { removedEntry, forms } = action.payload;

          state.forms = castDraft(forms);
          fixActiveTabOnRemoveInPlace(state, removedEntry);
        }
      })
      .addCase(addTemporaryPanel.fulfilled, (state, action) => {
        const { temporaryPanels, activeKey } = action.payload;

        state.temporaryPanels = castDraft(temporaryPanels);
        state.activeKey = activeKey;
        state.closedTabs[eventKeyForEntry(MOD_LAUNCHER)] = true;
      })
      .addCase(removeTemporaryPanel.fulfilled, (state, action) => {
        if (action.payload) {
          const { removedEntry, temporaryPanels } = action.payload;

          state.temporaryPanels = castDraft(temporaryPanels);
          fixActiveTabOnRemoveInPlace(state, removedEntry);
        }
      })
      .addCase(resolveTemporaryPanel.fulfilled, (state, action) => {
        if (action.payload) {
          const { resolvedEntry, temporaryPanels } = action.payload;

          state.temporaryPanels = castDraft(temporaryPanels);
          fixActiveTabOnRemoveInPlace(state, resolvedEntry);
        }
      });
  },
});

export default sidebarSlice;
