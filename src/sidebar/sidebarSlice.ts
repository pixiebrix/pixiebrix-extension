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
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type UUID } from "@/types/stringTypes";
import { defaultEventKey, eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import {
  cancelForm,
  cancelTemporaryPanel,
  closeTemporaryPanel,
  resolveTemporaryPanel,
} from "@/contentScript/messenger/api";
import { partition, remove, sortBy } from "lodash";
import { getTopLevelFrame } from "webext-messenger";
import { type SubmitPanelAction } from "@/bricks/errors";
import { castDraft, type Draft } from "immer";
import { localStorage } from "redux-persist-webextension-storage";
import { type StorageInterface } from "@/store/StorageInterface";
import { getVisiblePanelCount } from "@/sidebar/utils";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/constants";

const emptySidebarState: SidebarState = {
  panels: [],
  forms: [],
  temporaryPanels: [],
  staticPanels: [],
  modActivationPanel: null,
  activeKey: null,
  pendingActivePanel: null,
  closedTabs: {},
};

function eventKeyExists(state: SidebarState, query: string | null): boolean {
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
  { extensionId, blueprintId, panelHeading }: ActivatePanelOptions
): string {
  // Try matching on extension
  if (extensionId) {
    // Prefer form to panel -- however, it would be unusual to target an ephemeral form when reshowing the sidebar
    const extensionForm = state.forms.find(
      (x) => x.extensionId === extensionId
    );
    if (extensionForm) {
      return eventKeyForEntry(extensionForm);
    }

    const extensionTemporaryPanel = state.temporaryPanels.find(
      (x) => x.extensionId === extensionId
    );
    if (extensionTemporaryPanel) {
      return eventKeyForEntry(extensionTemporaryPanel);
    }

    const extensionPanel = state.panels.find(
      (x) => x.extensionId === extensionId
    );
    if (extensionPanel) {
      return eventKeyForEntry(extensionPanel);
    }
  }

  // Try matching on panel heading
  if (panelHeading) {
    const extensionPanel = state.panels
      .filter((x) => blueprintId == null || x.blueprintId === blueprintId)
      .find((x) => x.heading === panelHeading);
    if (extensionPanel) {
      return eventKeyForEntry(extensionPanel);
    }
  }

  // Try matching on blueprint
  if (blueprintId) {
    const blueprintPanel = state.panels.find(
      (x) => x.blueprintId === blueprintId
    );
    if (blueprintPanel) {
      return eventKeyForEntry(blueprintPanel);
    }
  }

  // Return the first static panel, if it exists
  if (state.staticPanels.length > 0) {
    return eventKeyForEntry(state.staticPanels[0]);
  }

  return null;
}

async function cancelPreexistingForms(forms: UUID[]): Promise<void> {
  const topLevelFrame = await getTopLevelFrame();
  cancelForm(topLevelFrame, ...forms);
}

async function cancelPanels(nonces: UUID[]): Promise<void> {
  const topLevelFrame = await getTopLevelFrame();
  cancelTemporaryPanel(topLevelFrame, nonces);
}

/**
 * Resolve panels without action/data.
 * @param nonces panel nonces
 */
async function closePanels(nonces: UUID[]): Promise<void> {
  const topLevelFrame = await getTopLevelFrame();
  closeTemporaryPanel(topLevelFrame, nonces);
}

/**
 * Resolve a panel with an action and optional detail
 * @param nonce the panel nonce
 * @param action the action to resolve the panel with
 */
async function resolvePanel(
  nonce: UUID,
  action: Pick<SubmitPanelAction, "type" | "detail">
): Promise<void> {
  const topLevelFrame = await getTopLevelFrame();
  resolveTemporaryPanel(topLevelFrame, nonce, action);
}

export function fixActiveTabOnRemove(
  state: Draft<SidebarState>,
  removedEntry: SidebarEntry | null
) {
  // Only update the active panel if the panel needs to change
  if (removedEntry && state.activeKey === eventKeyForEntry(removedEntry)) {
    const panels = [...state.forms, ...state.panels, ...state.temporaryPanels];

    const matchingExtension = panels.find(
      ({ extensionId }) =>
        "extensionId" in removedEntry &&
        extensionId === removedEntry.extensionId
    );

    if (matchingExtension) {
      // Immer Draft<T> type resolution can't handle JsonObject (recursive) types properly
      // See: https://github.com/immerjs/immer/issues/839
      // @ts-expect-error -- SidebarEntries.panels --> PanelEntry.actions --> PanelButton.detail is JsonObject
      state.activeKey = eventKeyForEntry(matchingExtension);
    } else {
      const matchingMod = panels.find(
        ({ blueprintId }) =>
          "blueprintId" in removedEntry &&
          // Need to check for removedEntry.blueprintId to avoid switching between ModComponentBases that don't have blueprint ids
          blueprintId === removedEntry.blueprintId &&
          blueprintId
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
  initialState: emptySidebarState,
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
      }>
    ) {
      /** We need a visible count > 1 to prevent useHideEmptySidebar from closing it on first load. If there are no visible panels,
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
          : defaultEventKey(state, state.closedTabs);
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
    addForm(state, action: PayloadAction<{ form: FormPanelEntry }>) {
      const { form } = action.payload;

      if (state.forms.some((x) => x.nonce === form.nonce)) {
        // Panel is already in the sidebar, do nothing as form definitions can't be updated. (There's no placeholder
        // loading state for forms.)
        return;
      }

      const [thisExtensionForms, otherForms] = partition(
        state.forms,
        (x) => x.extensionId === form.extensionId
      );

      // The UUID must be fetched synchronously to ensure the `form` Proxy element doesn't expire
      void cancelPreexistingForms(thisExtensionForms.map((form) => form.nonce));

      state.forms = [
        ...otherForms,
        // Unlike panels which are sorted, forms are like a "stack", will show the latest form available
        form,
      ];

      state.activeKey = eventKeyForEntry(form);
    },
    removeForm(state, action: PayloadAction<UUID>) {
      const nonce = action.payload;

      const entry = remove(state.forms, (form) => form.nonce === nonce)[0];

      fixActiveTabOnRemove(state, entry);
    },
    updateTemporaryPanel(
      state,
      action: PayloadAction<{ panel: TemporaryPanelEntry }>
    ) {
      const { panel } = action.payload;

      const index = state.temporaryPanels.findIndex(
        (x) => x.nonce === panel.nonce
      );
      if (index >= 0) {
        // eslint-disable-next-line security/detect-object-injection -- index from findIndex
        state.temporaryPanels[index] = castDraft(panel);
      }
    },
    addTemporaryPanel(
      state,
      action: PayloadAction<{ panel: TemporaryPanelEntry }>
    ) {
      const { panel } = action.payload;

      const [existingExtensionTemporaryPanels, otherTemporaryPanels] =
        partition(
          state.temporaryPanels,
          (x) => x.extensionId === panel.extensionId
        );

      // Cancel all panels for the extension, except if there's a placeholder that was added in setInitialPanels
      void cancelPanels(
        existingExtensionTemporaryPanels
          .filter((x) => x.nonce !== panel.nonce)
          .map(({ nonce }) => nonce)
      );

      state.temporaryPanels = castDraft([...otherTemporaryPanels, panel]);
      state.activeKey = eventKeyForEntry(panel);
    },
    removeTemporaryPanel(state, action: PayloadAction<UUID>) {
      const nonce = action.payload;

      const entry = remove(
        state.temporaryPanels,
        (panel) => panel.nonce === nonce
      )[0];

      void closePanels([nonce]);

      fixActiveTabOnRemove(state, entry);
    },
    resolveTemporaryPanel(
      state,
      action: PayloadAction<{ nonce: UUID; action: SubmitPanelAction }>
    ) {
      const { nonce, action: panelAction } = action.payload;

      const entry = remove(
        state.temporaryPanels,
        (panel) => panel.nonce === nonce
      )[0];

      void resolvePanel(nonce, panelAction);

      fixActiveTabOnRemove(state, entry);
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
        state.closedTabs[next] = false;
      } else {
        state.pendingActivePanel = payload;
      }
    },
    setPanels(state, action: PayloadAction<{ panels: PanelEntry[] }>) {
      // For now, pick an arbitrary order that's stable. There's no guarantees on which order panels are registered
      state.panels = castDraft(
        sortBy(action.payload.panels, (panel) => panel.extensionId)
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
      action: PayloadAction<ModActivationPanelEntry>
    ) {
      const entry = action.payload;
      state.modActivationPanel = entry;
      state.activeKey = eventKeyForEntry(entry);
    },
    hideModActivationPanel(state) {
      // We don't need to pass in an id to this action, because the can only be one active mod activation panel at a time
      const { modActivationPanel: entry } = state;
      state.modActivationPanel = null;
      fixActiveTabOnRemove(state, entry);
    },
    closeTab(state, action: PayloadAction<string>) {
      state.closedTabs[action.payload] = true;

      if (state.activeKey === action.payload) {
        state.activeKey = defaultEventKey(state, state.closedTabs);
      }
    },
    openTab(state, action: PayloadAction<string>) {
      state.closedTabs[action.payload] = false;
    },
  },
});

export const persistSidebarConfig = {
  key: "sidebar",
  /** We use localStorage instead of redux-persist-webextension-storage because we want to persist the sidebar state
   * @see StorageInterface */
  storage: localStorage as StorageInterface,
  version: 1,
  whitelist: ["closedTabs"],
};

export default sidebarSlice;
