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

import { type UUID } from "@/core";
import pDefer, { type DeferredPromise } from "p-defer";
import { expectContext } from "@/utils/expectContext";
import { CancelError } from "@/errors/businessErrors";
import { type TemporaryPanelEntry } from "@/sidebar/types";

type RegisteredPanel = {
  entry: TemporaryPanelEntry;
  registration: DeferredPromise<void>;
};

const panels = new Map<UUID, RegisteredPanel>();

export async function getPanelDefinition(
  nonce: UUID
): Promise<TemporaryPanelEntry> {
  expectContext("contentScript");

  return panels.get(nonce).entry;
}

/**
 * Register a temporary display panel
 * @param nonce The instance nonce for the panel to register
 * @param entry the panel definition
 */
export async function waitForTemporaryPanel(
  nonce: UUID,
  entry: TemporaryPanelEntry
): Promise<void> {
  expectContext("contentScript");

  const registration = pDefer<void>();

  if (panels.has(nonce)) {
    console.warn(
      `A temporary panel was already registered with nonce ${nonce}`
    );
  }

  panels.set(nonce, {
    entry,
    registration,
  });

  return registration.promise;
}

/**
 * Resolve some temporary panels' deferred promises
 * @param nonces The nonces of the panels to resolve
 */
export async function stopWaitingForTemporaryPanels(nonces: UUID[]) {
  expectContext("contentScript");

  for (const nonce of nonces) {
    panels.get(nonce)?.registration?.resolve();
    panels.delete(nonce);
  }
}

/**
 * Cancel some temporary panels' deferred promises
 * @param nonces The nonces of the panels to reject with a CancelError
 */
export async function cancelTemporaryPanels(nonces: UUID[]) {
  expectContext("contentScript");

  for (const nonce of nonces) {
    panels
      .get(nonce)
      ?.registration?.reject(
        new CancelError("Temporary panel was replaced with another panel")
      );
    panels.delete(nonce);
  }
}
