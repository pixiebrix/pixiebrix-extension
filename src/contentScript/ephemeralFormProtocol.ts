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

import { FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";
import { UUID } from "@/core";
import { expectContext } from "@/utils/expectContext";
import pDefer, { DeferredPromise } from "p-defer";
import { CancelError } from "@/errors/businessErrors";

type RegisteredForm = {
  definition: FormDefinition;
  registration: DeferredPromise<unknown>;
};

const forms = new Map<UUID, RegisteredForm>();

/**
 * Register a form with the content script that resolves the the form is either submitted or cancelled
 * @param nonce the form nonce
 * @param definition the form definition
 */
export async function registerForm(
  nonce: UUID,
  definition: FormDefinition
): Promise<unknown> {
  expectContext("contentScript");

  const registration = pDefer();

  if (forms.has(nonce)) {
    console.warn("A form was already registered with nonce %s", nonce);
  }

  forms.set(nonce, {
    definition,
    registration,
  });

  return registration.promise;
}

/**
 * Helper method to unregister the deferred promise for the form.
 * @param formNonce
 */
function unregisterForm(formNonce: UUID) {
  expectContext("contentScript");

  forms.delete(formNonce);
}

export async function getFormDefinition(nonce: UUID): Promise<FormDefinition> {
  expectContext("contentScript");

  return forms.get(nonce).definition;
}

export async function resolveForm(
  formNonce: UUID,
  values: unknown
): Promise<void> {
  expectContext("contentScript");

  const form = forms.get(formNonce);
  if (!form) {
    throw new Error(`Form not registered: ${formNonce}`);
  }

  form.registration.resolve(values);
  unregisterForm(formNonce);
}

/**
 * Cancel the form. Is a NOP if the form is no longer registered.
 * @param formNonce the form nonce
 */
export async function cancelForm(formNonce: UUID): Promise<void> {
  expectContext("contentScript");

  const form = forms.get(formNonce);
  form?.registration.reject(new CancelError("User cancelled the action"));
  unregisterForm(formNonce);
}
