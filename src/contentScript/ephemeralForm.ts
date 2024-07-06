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

import type { FormDefinition } from "@/platform/forms/formTypes";
import { cancelForm, registerForm } from "@/platform/forms/formController";
import {
  hideSidebarForm,
  showSidebar,
  showSidebarForm,
  sidePanelOnClose,
} from "@/contentScript/sidebarController";
import { uuidv4 } from "@/types/helpers";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { BusinessError } from "@/errors/businessErrors";
import { getThisFrame } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import { showModal } from "@/contentScript/modalDom";
import type { Target } from "@/types/messengerTypes";
import type { ModComponentRef } from "@/types/modComponentTypes";

// The modes for createFrameSource are different from the location argument for FormTransformer. The mode for the frame
// just determines the layout container of the form
type Mode = "modal" | "panel";

export async function createFrameSource(
  target: Target,
  nonce: string,
  mode: Mode,
): Promise<URL> {
  const frameSource = new URL(browser.runtime.getURL("ephemeralForm.html"));
  frameSource.searchParams.set("nonce", nonce);
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", mode);
  return frameSource;
}

/**
 * The showForm method for the webext platform creates an iframe in a modal, or a panel in a sidebar.
 */
export async function ephemeralForm(
  definition: FormDefinition,
  controller: AbortController,
  modComponentRef: ModComponentRef,
): Promise<unknown> {
  expectContext("contentScript");

  if (definition.location === "sidebar" && isLoadedInIframe()) {
    // Validate before registerForm to avoid an uncaught promise rejection
    throw new BusinessError(
      "Cannot show sidebar in a frame. To use the sidebar, set the target to Top-level Frame",
    );
  }

  const formNonce = uuidv4();

  // Register form before adding modal or sidebar to avoid race condition in retrieving the form definition.
  // Pre-registering the form also allows the sidebar to know a form will be shown in computing the default
  // tab to show during sidebar initialization.
  const formPromise = registerForm({
    nonce: formNonce,
    modComponentRef,
    definition,
  });

  if (definition.location === "sidebar") {
    // Ensure the sidebar is visible (which may also be showing persistent panels)
    await showSidebar();

    await showSidebarForm({
      nonce: formNonce,
      form: definition,
      modComponentRef,
    });

    // Two-way binding between sidebar and form. Listen for the user (or an action) closing the sidebar
    sidePanelOnClose(controller.abort.bind(controller));

    controller.signal.addEventListener("abort", () => {
      // NOTE: we're not hiding the side panel here to avoid closing the sidebar if the user already had it open.
      // In the future we might creating/sending a closeIfEmpty message to the sidebar, so that it would close
      // if this form was the only entry in the panel
      void hideSidebarForm(formNonce);
      void cancelForm(formNonce);
    });
  } else {
    const frameSource = await createFrameSource(
      await getThisFrame(),
      formNonce,
      definition.location,
    );

    showModal({ url: frameSource, controller });

    controller.signal.addEventListener("abort", () => {
      void cancelForm(formNonce);
    });
  }

  return formPromise;
}
