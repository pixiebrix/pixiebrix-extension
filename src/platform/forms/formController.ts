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

export type RegisteredForm = {
  /**
   * The Mod Component that created the form. Only 1 form can be registered per Mod Component.
   */
  extensionId: UUID;
  definition: FormDefinition;
  registration: DeferredPromise<unknown>;
  blueprintId: Nullishable<RegistryId>;
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

  if (forms.has(nonce)) {
    // This should never happen, but if it does, it's a bug.
    throw new Error(`Form with nonce already exists: ${nonce}`);
  }

  const preexistingForms = [...forms.entries()].filter(
    ([_, registeredForm]) => registeredForm.extensionId === extensionId,
  );

  if (preexistingForms.length > 0) {
    // Cancel any preexisting forms from the same mod definition to prevent duplicates
    await cancelForm(...preexistingForms.map(([nonce]) => nonce));
  }

  forms.set(nonce, {
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
 * @param formNonces the form nonces
 */
export async function cancelForm(...formNonces: UUID[]): Promise<void> {
  for (const formNonce of formNonces) {
    const form = forms.get(formNonce);
    form?.registration.reject(new CancelError("User cancelled the action"));
    unregisterForm(formNonce);
  }
}

/**
 * Test helper to cancel all pending forms.
 */
export async function TEST_cancelAll(): Promise<void> {
  await cancelForm(...forms.keys());
}
