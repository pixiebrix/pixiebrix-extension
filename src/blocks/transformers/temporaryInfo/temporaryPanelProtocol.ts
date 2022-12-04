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

import { type UUID } from "@/core";
import pDefer, { type DeferredPromise } from "p-defer";
import { expectContext } from "@/utils/expectContext";

const panels = new Map<UUID, DeferredPromise<void>>();

/**
 * Register a temporary display panel
 * @param nonce The instance nonce for the panel to register
 */
export async function waitForTemporaryPanel(nonce: UUID): Promise<void> {
  expectContext("contentScript");

  const registration = pDefer<void>();

  if (panels.has(nonce)) {
    console.warn(
      `A temporary panel was already registered with nonce ${nonce}`
    );
  }

  panels.set(nonce, registration);

  return registration.promise;
}

/**
 * Resolve some temporary panels' deferred promises
 * @param nonces The nonces of the panels to resolve
 */
export async function stopWaitingForTemporaryPanels(nonces: UUID[]) {
  expectContext("contentScript");

  for (const nonce of nonces) {
    panels.get(nonce)?.resolve();
    panels.delete(nonce);
  }
}
