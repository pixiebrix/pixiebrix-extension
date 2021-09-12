/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
  FORM_CANCEL,
  FormDefinition,
  FORM_GET_DEFINITION,
  FORM_RESOLVE,
} from "@/blocks/transformers/modalForm/formTypes";
import { UUID } from "@/core";
import { expectContext } from "@/utils/expectContext";
import { HandlerMap } from "@/messaging/protocol";
import { CancelError } from "@/errors";

type Callbacks = {
  resolve: (result: unknown) => void;
  reject: (reason: unknown) => void;
};

const formDefinitions = new Map<UUID, FormDefinition>();
const formCallbacks = new Map<UUID, Callbacks>();

/**
 * Register a form with the content script.
 * @param nonce the form nonce
 * @param definition the form definition
 */
export async function registerForm(
  nonce: UUID,
  definition: FormDefinition
): Promise<unknown> {
  expectContext("contentScript");

  formDefinitions.set(nonce, definition);

  return new Promise((resolve, reject) => {
    formCallbacks.set(nonce, {
      resolve,
      reject,
    });
  });
}

function unregisterForm(nonce: UUID) {
  formCallbacks.delete(nonce);
  formDefinitions.delete(nonce);
}

const handlers = new HandlerMap();

type GetFormDefinitionMessage = {
  type: typeof FORM_GET_DEFINITION;
  payload: { nonce: UUID };
};

type ResolveFormMessage = {
  type: typeof FORM_RESOLVE;
  payload: { nonce: UUID; values: unknown };
};

type CancelFormMessage = {
  type: typeof FORM_CANCEL;
  payload: { nonce: UUID };
};

handlers.set(FORM_GET_DEFINITION, async (request: GetFormDefinitionMessage) =>
  formDefinitions.get(request.payload.nonce)
);

handlers.set(FORM_RESOLVE, async (request: ResolveFormMessage) => {
  const { nonce, values } = request.payload;
  formCallbacks.get(nonce).resolve(values);
  unregisterForm(nonce);
});

handlers.set(FORM_CANCEL, async (request: CancelFormMessage) => {
  const { nonce } = request.payload;
  formCallbacks.get(nonce).reject(new CancelError("User cancelled the action"));
  unregisterForm(nonce);
});

export function initFormListener() {
  expectContext("contentScript");
  browser.runtime.onMessage.addListener(handlers.asListener());
}
