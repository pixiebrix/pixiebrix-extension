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

import {
  type SidebarEntries,
  type FormEntry,
  type PanelEntry,
  type ActivatePanelOptions,
  type TemporaryPanelEntry,
  type ActivateRecipeEntry,
  type SidebarEntry,
} from "@/sidebar/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type UUID } from "@/types/stringTypes";
import { defaultEventKey, eventKeyForEntry } from "@/sidebar/utils";
import {
  cancelForm,
  cancelTemporaryPanel,
  closeTemporaryPanel,
  resolveTemporaryPanel,
} from "@/contentScript/messenger/api";
import { partition, remove, sortBy } from "lodash";
import { getTopLevelFrame } from "webext-messenger";
import { type SubmitPanelAction } from "@/blocks/errors";
import { type WritableDraft } from "immer/dist/types/types-external";

export type SidebarState = SidebarEntries & {
  activeKey: string;

  /**
   * Pending panel activation request.
   *
   * Because there's a race condition between activatePanel and setPanels, etc. we need to keep track of the activation
   * request in order to fulfill it once the panel is registered.
   */
  pendingActivePanel: ActivatePanelOptions | null;
};

const emptySidebarState: SidebarState = {
  panels: [],
  forms: [],
  temporaryPanels: [],
  recipeToActivate: null,
  activeKey: eventKeyForEntry({ type: "home" }),
  pendingActivePanel: null,
};

function eventKeyExists(state: SidebarState, query: string | null): boolean {
  if (query == null) {
    return false;
  }

  return (
    state.forms.some((x) => eventKeyForEntry(x) === query) ||
    state.temporaryPanels.some((x) => eventKeyForEntry(x) === query) ||
    state.panels.some((x) => eventKeyForEntry(x) === query) ||
    eventKeyForEntry(state.recipeToActivate) === query
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

  // TODO: default is the home tab
  return eventKeyForEntry({ type: "home" });
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

function fixActiveTabOnRemove(
  state: WritableDraft<SidebarState>,
  removedEntry: SidebarEntry | null
) {
  // Only update the active panel if the panel needs to change
  if (removedEntry && state.activeKey === eventKeyForEntry(removedEntry)) {
    state.activeKey = defaultEventKey(state);
  }
}

const sidebarSlice = createSlice({
  initialState: emptySidebarState,
  name: "sidebar",
  reducers: {
    selectTab(state, action: PayloadAction<string>) {
      // We were seeing some automatic calls to selectTab with a stale event key...
      state.activeKey = eventKeyExists(state, action.payload)
        ? action.payload
        : defaultEventKey(state);

      // User manually selected a panel, so cancel any pending automatic panel activation
      state.pendingActivePanel = null;
    },
    addForm(state, action: PayloadAction<{ form: FormEntry }>) {
      const { form } = action.payload;

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
        state.temporaryPanels[index] = panel;
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

      void cancelPanels(
        existingExtensionTemporaryPanels.map((panel) => panel.nonce)
      );

      state.temporaryPanels = [...otherTemporaryPanels, panel];
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

      const next = findNextActiveKey(state, payload);

      if (next) {
        state.activeKey = next;
      } else {
        state.pendingActivePanel = payload;
      }
    },
    setPanels(state, action: PayloadAction<{ panels: PanelEntry[] }>) {
      // For now, pick an arbitrary order that's stable. There's no guarantees on which order panels are registered
      state.panels = sortBy(
        action.payload.panels,
        (panel) => panel.extensionId
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

      // If a panel is no longer available, reset the current tab to a valid tab
      if (!eventKeyExists(state, state.activeKey)) {
        state.activeKey = defaultEventKey(state);
      }
    },
    showActivateRecipe(state, action: PayloadAction<ActivateRecipeEntry>) {
      const entry = action.payload;
      state.recipeToActivate = entry;
      state.activeKey = eventKeyForEntry(entry);
    },
    hideActivateRecipe(state) {
      const { recipeToActivate: entry } = state;
      state.recipeToActivate = null;
      fixActiveTabOnRemove(state, entry);
    },
  },
});

export default sidebarSlice;
