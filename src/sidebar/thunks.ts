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

import {
  cancelForm,
  cancelTemporaryPanel,
} from "@/contentScript/messenger/strict/api";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import {
  type TemporaryPanelEntry,
  type FormPanelEntry,
  type SidebarState,
} from "@/types/sidebarTypes";
import { type UUID } from "@/types/stringTypes";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { partition } from "lodash";

async function cancelPreexistingForms(forms: UUID[]): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  cancelForm(topLevelFrame, ...forms);
}

type AddFormPanelReturn = {
  forms: SidebarState["forms"];
  newForm: SidebarState["forms"][number];
} | void;

export const addFormPanel = createAsyncThunk<
  AddFormPanelReturn,
  { form: FormPanelEntry },
  { state: SidebarState }
>("sidebar/addFormPanel", async ({ form }, { getState }) => {
  const state = getState();

  // If the form is already in the sidebar, do nothing
  if (state.forms.some(({ nonce }) => nonce === form.nonce)) {
    return;
  }

  const [thisExtensionForms, otherForms] = partition(
    state.forms,
    ({ extensionId }) => extensionId === form.extensionId,
  );

  // The UUID must be fetched synchronously to ensure the `form` Proxy element doesn't expire
  await cancelPreexistingForms(thisExtensionForms.map((form) => form.nonce));

  return {
    forms: [
      ...otherForms,
      // Unlike panels which are sorted, forms are like a "stack", will show the latest form available
      form,
    ],
    newForm: form,
  };
});

async function cancelPanels(nonces: UUID[]): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  cancelTemporaryPanel(topLevelFrame, nonces);
}

type AddTemporaryPanelReturn = {
  temporaryPanels: SidebarState["temporaryPanels"];
  activeKey: SidebarState["activeKey"];
};

export const addTemporaryPanel = createAsyncThunk<
  AddTemporaryPanelReturn,
  { panel: TemporaryPanelEntry },
  { state: SidebarState }
>("sidebar/addTemporaryPanel", async ({ panel }, { getState }) => {
  const state = getState();

  const [existingExtensionTemporaryPanels, otherTemporaryPanels] = partition(
    state.temporaryPanels,
    (x) => x.extensionId === panel.extensionId,
  );

  // Cancel all panels for the extension, except if there's a placeholder that was added in setInitialPanels
  await cancelPanels(
    existingExtensionTemporaryPanels
      .filter((x) => x.nonce !== panel.nonce)
      .map(({ nonce }) => nonce),
  );

  return {
    temporaryPanels: [...otherTemporaryPanels, panel],
    activeKey: eventKeyForEntry(panel),
  };
});
