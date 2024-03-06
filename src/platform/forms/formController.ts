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

import { type FormDefinition } from "@/platform/forms/formTypes";
import { type UUID } from "@/types/stringTypes";
import pDefer, { type DeferredPromise } from "p-defer";
import { CancelError } from "@/errors/businessErrors";
import { type FormPanelEntry } from "@/types/sidebarTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { uuidv4 } from "@/types/helpers";

const FORM_CONTROLLER_ADDED_SYMBOL = Symbol.for("form-controller-added");

declare global {
  interface Window {
    [FORM_CONTROLLER_ADDED_SYMBOL]?: UUID;
  }
}

export type RegisteredForm = {
  /**
   * The Mod Component that created the form. Only 1 form can be registered per Mod Component.
   */
  extensionId: UUID;
  definition: FormDefinition;
  registration: DeferredPromise<unknown>;
  blueprintId: Nullishable<RegistryId>;
};

class RegisteredForms {
  private readonly forms: Map<UUID, RegisteredForm> = new Map<
    UUID,
    RegisteredForm
  >();
  private readonly nonce = uuidv4();

  constructor() {
    if (window[FORM_CONTROLLER_ADDED_SYMBOL]) {
      console.warn(
        `focusController(${this.nonce}): ${window[FORM_CONTROLLER_ADDED_SYMBOL]} already added to window`,
      );
    } else {
      window[FORM_CONTROLLER_ADDED_SYMBOL] = this.nonce;
    }
  }

  getNonce(): UUID {
    return this.nonce;
  }

  getForms(): Map<UUID, RegisteredForm> {
    return this.forms;
  }

  get(nonce: UUID): RegisteredForm | undefined {
    return this.forms.get(nonce);
  }

  set(nonce: UUID, form: RegisteredForm): void {
    this.forms.set(nonce, form);
  }

  delete(nonce: UUID): void {
    this.forms.delete(nonce);
  }
}

/**
 * Mapping from form nonce to form definition.
 */
const registeredForms = new RegisteredForms();

/**
 * Returns form panel entries corresponding forms registered for the sidebar.
 */
export function getFormPanelSidebarEntries(): FormPanelEntry[] {
  return [...registeredForms.getForms().entries()]
    .filter(([, form]) => form.definition.location === "sidebar")
    .map(([nonce, form]) => ({
      type: "form",
      nonce,
      extensionId: form.extensionId,
      blueprintId: form.blueprintId ?? undefined,
      form: form.definition,
    }));
}

/**
 * Register a form with the content script that resolves the form is either submitted or cancelled
 * @param extensionId the id of the extension that created the form
 * @param nonce the form nonce
 * @param definition the form definition
 * @param blueprintId the blueprint that contains the form
 */
export async function registerForm({
  extensionId,
  nonce,
  definition,
  blueprintId,
}: {
  extensionId: UUID;
  nonce: UUID;
  definition: FormDefinition;
  blueprintId: Nullishable<RegistryId>;
}): Promise<unknown> {
  const registration = pDefer();

  console.log(
    "*** registerForm",
    "registeredForms.nonce:",
    registeredForms.getNonce(),
  );
  console.log("*** registerForm", "form nonce:", nonce);

  if (registeredForms.getForms().has(nonce)) {
    // This should never happen, but if it does, it's a bug.
    throw new Error(`Form with nonce already exists: ${nonce}`);
  }

  const preexistingForms = [...registeredForms.getForms().entries()].filter(
    ([_, registeredForm]) => registeredForm.extensionId === extensionId,
  );

  if (preexistingForms.length > 0) {
    // Cancel any preexisting forms from the same mod definition to prevent duplicates
    await cancelForm(...preexistingForms.map(([nonce]) => nonce));
  }

  registeredForms.set(nonce, {
    extensionId,
    definition,
    registration,
    blueprintId,
  });

  return registration.promise;
}

/**
 * Helper method to unregister the deferred promise for the form.
 */
function unregisterForm(formNonce: UUID): void {
  registeredForms.delete(formNonce);
}

export async function getFormDefinition(
  formNonce: UUID,
): Promise<FormDefinition> {
  const form = registeredForms.get(formNonce);
  if (!form) {
    throw new Error(`Form not registered: ${formNonce}`);
  }

  return form.definition;
}

export async function resolveForm(
  formNonce: UUID,
  values: unknown,
): Promise<void> {
  const form = registeredForms.get(formNonce);
  if (!form) {
    throw new Error(`Form not registered: ${formNonce}`);
  }

  form.registration.resolve(values);
  unregisterForm(formNonce);
}

/**
 * Cancel some forms. Is a NOP if a form is no longer registered.
 * @param formNonces the form nonces
 */
export async function cancelForm(...formNonces: UUID[]): Promise<void> {
  console.log("*** forms to cancel:", formNonces);
  for (const formNonce of formNonces) {
    console.log("*** cancelForm:", formNonce);
    const form = registeredForms.get(formNonce);

    if (!form) {
      console.warn(`*** Form not registered: ${formNonce}`);
      continue;
    }

    form?.registration.reject(new CancelError("User cancelled the action"));
    unregisterForm(formNonce);
  }
}

/**
 * Test helper to cancel all pending forms.
 * @constructor
 */
export async function TEST_cancelAll(): Promise<void> {
  await cancelForm(...registeredForms.getForms().keys());
}
