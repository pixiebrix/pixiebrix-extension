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

import {
  SidebarEntries,
  FormEntry,
  PanelEntry,
  ActivatePanelOptions,
  TemporaryPanelEntry,
} from "@/sidebar/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { defaultEventKey, mapTabEventKey } from "@/sidebar/utils";
import { cancelForm } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";
import { partition, sortBy } from "lodash";
import { UUID } from "@/idTypes";

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

export const emptySidebarState: SidebarState = {
  panels: [],
  forms: [],
  temporaryPanels: [],
  activeKey: null,
  pendingActivePanel: null,
};

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
      return mapTabEventKey("form", extensionForm);
    }

    const extensionPanel = state.panels.find(
      (x) => x.extensionId === extensionId
    );
    if (extensionPanel) {
      return mapTabEventKey("panel", extensionPanel);
    }
  }

  // Try matching on panel heading
  if (panelHeading) {
    const extensionPanel = state.panels
      .filter((x) => blueprintId == null || x.blueprintId === blueprintId)
      .find((x) => x.heading === panelHeading);
    if (extensionPanel) {
      return mapTabEventKey("panel", extensionPanel);
    }
  }

  // Try matching on blueprint
  if (blueprintId) {
    const blueprintPanel = state.panels.find(
      (x) => x.blueprintId === blueprintId
    );
    if (blueprintPanel) {
      return mapTabEventKey("panel", blueprintPanel);
    }
  }

  return null;
}

async function cancelPreexistingForms(forms: UUID[]): Promise<void> {
  // TODO: Replace with `tabId: "this"` once implemented in the messenger
  const sender = await whoAmI();
  cancelForm({ tabId: sender.tab.id, frameId: 0 }, ...forms);
}

const sidebarSlice = createSlice({
  initialState: emptySidebarState,
  name: "sidebar",
  reducers: {
    selectTab(state, action: PayloadAction<string>) {
      state.activeKey = action.payload;
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
      state.activeKey = mapTabEventKey("form", form);
    },
    removeForm(state, action: PayloadAction<UUID>) {
      const nonce = action.payload;
      state.forms = state.forms.filter((x) => x.nonce !== nonce);
      state.activeKey = defaultEventKey(state);
    },
    addTemporaryPanel(
      state,
      action: PayloadAction<{ panel: TemporaryPanelEntry }>
    ) {
      const { panel } = action.payload;

      const [, otherTempPanels] = partition(
        state.temporaryPanels,
        (x) => x.extensionId === panel.extensionId
      );

      state.temporaryPanels = [...otherTempPanels, panel];
      state.activeKey = mapTabEventKey("temporaryPanel", panel);
    },
    removeTemporaryPanel(state, action: PayloadAction<UUID>) {
      const nonce = action.payload;
      state.temporaryPanels = state.temporaryPanels.filter(
        (panel) => panel.nonce !== nonce
      );
      state.activeKey = defaultEventKey(state);
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
      if (
        state.activeKey == null ||
        (state.activeKey.startsWith("panel-") &&
          !state.panels.some(
            (x) => mapTabEventKey("panel", x) === state.activeKey
          ))
      ) {
        state.activeKey = defaultEventKey(state);
      }
    },
  },
});

export default sidebarSlice;
