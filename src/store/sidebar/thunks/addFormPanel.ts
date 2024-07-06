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

import { cancelForm } from "@/contentScript/messenger/api";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { type SidebarState, type FormPanelEntry } from "@/types/sidebarTypes";
import { type UUID } from "@/types/stringTypes";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { partition } from "lodash";

type AddFormPanelReturn =
  | {
      forms: SidebarState["forms"];
      newForm: SidebarState["forms"][number];
    }
  | undefined;

const addFormPanel = createAsyncThunk<
  AddFormPanelReturn,
  { form: FormPanelEntry },
  { state: { sidebar: SidebarState } }
>("sidebar/addFormPanel", async ({ form }, { getState }) => {
  const { forms } = getState().sidebar;

  // If the form is already in the sidebar, do nothing
  if (forms.some(({ nonce }) => nonce === form.nonce)) {
    return;
  }

  const [thisModComponentForms, otherForms] = partition(
    forms,
    ({ modComponentRef }) =>
      modComponentRef.extensionId === form.modComponentRef.extensionId,
  );

  // The UUID must be fetched synchronously to ensure the `form` Proxy element doesn't expire
  await cancelPreexistingForms(thisModComponentForms.map((form) => form.nonce));

  return {
    forms: [
      ...otherForms,
      // Unlike panels which are sorted, forms are like a "stack", will show the latest form available
      form,
    ],
    newForm: form,
  };
});

async function cancelPreexistingForms(forms: UUID[]): Promise<void> {
  const topLevelFrame = await getConnectedTarget();
  cancelForm(topLevelFrame, ...forms);
}

export default addFormPanel;
