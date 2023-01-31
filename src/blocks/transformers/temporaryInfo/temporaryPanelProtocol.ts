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
import { type PanelAction, type TemporaryPanelEntry } from "@/sidebar/types";

type RegisteredPanel = {
  entry: TemporaryPanelEntry;
  registration: DeferredPromise<PanelAction | null>;
};

const panels = new Map<UUID, RegisteredPanel>();
// Mapping from extensionId to active panel nonces
const extensionNonces = new Map<UUID, Set<UUID>>();

/**
 * Get panel definition, or error if panel is not defined for nonce.
 * @param nonce the panel nonce
 */
export async function getPanelDefinition(
  nonce: UUID
): Promise<TemporaryPanelEntry> {
  expectContext("contentScript");

  const panel = panels.get(nonce);

  if (!panel) {
    throw new Error("Panel definition not found");
  }

  return panel.entry;
}

/**
 * Update a panel definition. NOTE: the caller is responsible for notifying the container to refetch the
 * panel definition.
 * @param entry the panel definition
 */
export function updatePanelDefinition(entry: TemporaryPanelEntry): void {
  expectContext("contentScript");

  const panel = panels.get(entry.nonce);

  if (!panel) {
    console.warn("Unknown panel: %s", entry.nonce);
    return;
  }

  if (panel.entry.extensionId !== entry.extensionId) {
    throw new Error("extensionId mismatch");
  }

  panel.entry = entry;
}

/**
 * Register a temporary display panel
 * @param nonce The instance nonce for the panel to register
 * @param entry the panel definition
 * @param onRegister callback to run after the panel is registered
 */
export async function waitForTemporaryPanel(
  nonce: UUID,
  entry: TemporaryPanelEntry,
  { onRegister }: { onRegister?: () => void } = {}
): Promise<PanelAction | null> {
  expectContext("contentScript");

  const registration = pDefer<PanelAction | null>();

  if (panels.has(nonce)) {
    console.warn(
      `A temporary panel was already registered with nonce ${nonce}`
    );
  }

  panels.set(nonce, {
    entry,
    registration,
  });

  if (!extensionNonces.has(entry.extensionId)) {
    extensionNonces.set(entry.extensionId, new Set());
  }

  extensionNonces.get(entry.extensionId).add(nonce);

  onRegister?.();

  return registration.promise;
}

/**
 * Helper method to remove panel from panels and extensionNonces.
 * @param panelNonce
 */
function removePanelEntry(panelNonce: UUID): void {
  const panel = panels.get(panelNonce);
  if (panel) {
    const { extensionId } = panel.entry;
    extensionNonces.get(extensionId).delete(panelNonce);
  }

  panels.delete(panelNonce);
}

/**
 * Resolve some temporary panels' deferred promises
 * @param nonces The nonces of the panels to resolve
 * @see resolveTemporaryPanel
 */
export async function stopWaitingForTemporaryPanels(nonces: UUID[]) {
  expectContext("contentScript");

  for (const nonce of nonces) {
    panels.get(nonce)?.registration.resolve();
    removePanelEntry(nonce);
  }
}

/**
 * Resolve some temporary panel with an action.
 * @param nonce The nonce of the panels to resolve
 * @param action The action to resolve the panel with
 */
export async function resolveTemporaryPanel(
  nonce: UUID,
  action: PanelAction
): Promise<void> {
  expectContext("contentScript");

  panels.get(nonce)?.registration.resolve(action);
  panels.delete(nonce);
}

/**
 * Cancel some temporary panels' deferred promises
 * @param nonces The nonces of the panels to reject with a CancelError
 */
export async function cancelTemporaryPanels(nonces: UUID[]): Promise<void> {
  expectContext("contentScript");

  for (const nonce of nonces) {
    panels
      .get(nonce)
      ?.registration?.reject(
        new CancelError("Temporary panel was replaced with another panel")
      );
    removePanelEntry(nonce);
  }
}

/**
 * Cancel all temporary panels for a given extension.
 * @see cancelTemporaryPanels
 */
export async function cancelTemporaryPanelsForExtension(
  extensionId: UUID
): Promise<void> {
  const nonces = extensionNonces.get(extensionId) ?? new Set();
  await cancelTemporaryPanels([...nonces]);
}
