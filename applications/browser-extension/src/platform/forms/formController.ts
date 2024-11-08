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

import { type FormDefinition } from "./formTypes";
import { type UUID } from "../../types/stringTypes";
import pDefer, { type DeferredPromise } from "p-defer";
import { CancelError } from "../../errors/businessErrors";
import { type FormPanelEntry } from "../../types/sidebarTypes";
import { type ModComponentRef } from "../../types/modComponentTypes";

export type RegisteredForm = {
  /**
   * The Mod Component that created the form. Only 1 form can be registered per Mod Component.
   */
  modComponentRef: ModComponentRef;
  definition: FormDefinition;
  registration: DeferredPromise<unknown>;
};

/**
 * Mapping from form nonce to form definition.
 */
const forms = new Map<UUID, RegisteredForm>();

/**
 * Returns form panel entries corresponding forms registered for the sidebar.
 */
export function getFormPanelSidebarEntries(): FormPanelEntry[] {
  return [...forms.entries()]
    .filter(([, form]) => form.definition.location === "sidebar")
    .map(([nonce, form]) => ({
      type: "form",
      nonce,
      modComponentRef: form.modComponentRef,
      form: form.definition,
    }));
}

/**
 * Register a form with the content script that resolves the form is either submitted or cancelled
 * @param componentRef the mod component that created the form
 * @param nonce the form nonce
 * @param definition the form definition
 */
export async function registerForm({
  nonce,
  definition,
  modComponentRef,
}: {
  modComponentRef: ModComponentRef;
  nonce: UUID;
  definition: FormDefinition;
}): Promise<unknown> {
  const registration = pDefer();

  if (forms.has(nonce)) {
    // This should never happen, but if it does, it's a bug.
    throw new Error(`Form with nonce already exists: ${nonce}`);
  }

  const preexistingForms = [...forms.entries()].filter(
    ([_, registeredForm]) =>
      registeredForm.modComponentRef.modComponentId ===
      modComponentRef.modComponentId,
  );

  if (preexistingForms.length > 0) {
    // Cancel any preexisting forms from the same mod definition to prevent duplicates
    await cancelForm(...preexistingForms.map(([nonce]) => nonce));
  }

  forms.set(nonce, {
    modComponentRef,
    definition,
    registration,
  });

  return registration.promise;
}

/**
 * Helper method to unregister the deferred promise for the form.
 */
function unregisterForm(formNonce: UUID): void {
  forms.delete(formNonce);
}

export async function getFormDefinition(
  formNonce: UUID,
): Promise<FormDefinition> {
  const form = forms.get(formNonce);
  if (!form) {
    throw new Error(`Form not registered: ${formNonce}`);
  }

  return form.definition;
}

export async function resolveForm(
  formNonce: UUID,
  values: unknown,
): Promise<void> {
  const form = forms.get(formNonce);
  if (!form) {
    throw new Error(`Form not registered: ${formNonce}`);
  }

  form.registration.resolve(values);
  unregisterForm(formNonce);
}

/**
 * Cancel some forms. Is a NOP if a form is no longer registered.
 */
// XXX: consider revising signature to accept array of nonces to allow for an options parameter
export async function cancelForm(...formNonces: UUID[]): Promise<void> {
  for (const formNonce of formNonces) {
    const form = forms.get(formNonce);
    form?.registration.reject(new CancelError("User cancelled the action"));
    unregisterForm(formNonce);
  }
}

/**
 * Cancel all pending forms.
 */
export async function cancelAll(): Promise<void> {
  for (const [formNonce, form] of forms.entries()) {
    form.registration.reject(new CancelError("Form automatically closed"));
    unregisterForm(formNonce);
  }
}
