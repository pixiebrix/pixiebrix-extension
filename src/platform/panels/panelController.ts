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

import { type UUID } from "@/types/stringTypes";
import pDefer, { type DeferredPromise } from "p-defer";
import {
  type PanelAction,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { ClosePanelAction } from "@/bricks/errors";
import { CancelError } from "@/errors/businessErrors";
import { type Except, type SetOptional } from "type-fest";
import { type Location } from "@/types/starterBrickTypes";
import { isObject } from "@/utils/objectUtils";

type RegisteredPanel = {
  /**
   * The location of the panel. Used to determine which registered temporary panels to reserve space for in the
   * sidebar when the sidebar opens.
   */
  location: Location;
  /**
   * The id of the extension that owns the panel.
   *
   * Must match RegisteredPanel.entry.modComponentId if entry is defined.
   */
  modComponentId: UUID;
  /**
   * The deferred promise that will be resolved when the panel is submitted/closed
   */
  registration: DeferredPromise<PanelAction | null>;
  /**
   * The panel entry, or undefined for placeholder panels
   */
  entry: Except<TemporaryPanelEntry, "type">;
};

type PlaceholderPanel = SetOptional<RegisteredPanel, "entry">;

const panels = new Map<UUID, RegisteredPanel | PlaceholderPanel>();

// Mapping from modComponentId to active panel nonces
const modComponentNonces = new Map<UUID, Set<UUID>>();

/**
 * Return all temporary panel entries.
 */
export function getTemporaryPanelSidebarEntries(): TemporaryPanelEntry[] {
  return [...panels.values()]
    .filter(
      (panel): panel is RegisteredPanel =>
        Boolean(panel.entry) && panel.location === "panel",
    )
    .map((panel) => ({
      type: "temporaryPanel",
      ...panel.entry,
    }));
}

/**
 * Get panel definition, or error if panel is not defined for nonce.
 */
export async function getPanelDefinition(
  panelNonce: UUID,
): Promise<TemporaryPanelEntry> {
  const panel = panels.get(panelNonce);

  if (!panel) {
    throw new Error("Panel definition not found");
  }

  if (!panel.entry) {
    throw new Error("The panel is an empty placeholder");
  }

  return { type: "temporaryPanel", ...panel.entry };
}

/**
 * Update a panel definition. NOTE: the caller is responsible for notifying the container to refetch the
 * panel definition.
 */
export function updatePanelDefinition(
  panelDefinition: Except<TemporaryPanelEntry, "type">,
): void {
  const panel = panels.get(panelDefinition.nonce);

  if (!panel) {
    console.warn("Unknown panel: %s", panelDefinition.nonce);
    return;
  }

  // Panel entry may be undefined if the panel was registered with registerEmptyTemporaryPanel
  if (
    panel.entry &&
    panel.entry.modComponentRef.modComponentId !==
      panelDefinition.modComponentRef.modComponentId
  ) {
    throw new Error("modComponentId mismatch");
  }

  panel.entry = panelDefinition;
}

/**
 * Register an empty panel for a given nonce and modComponentId. Use to pre-allocate a "loading" state while the panel
 * content is being initialized.
 * @param nonce the panel nonce
 * @param modComponentId the id of the extension that owns the panel
 * @param location the location of the panel
 */
export function registerEmptyTemporaryPanel({
  nonce,
  modComponentId,
  location,
}: {
  nonce: UUID;
  modComponentId: UUID;
  location: Location;
}) {
  if (panels.has(nonce)) {
    console.error(
      `A temporary panel was already registered with nonce ${nonce}`,
    );
    return;
  }

  const registration = pDefer<PanelAction | null>();

  panels.set(nonce, {
    modComponentId,
    registration,
    location,
  });

  const set = modComponentNonces.get(modComponentId) ?? new Set();
  modComponentNonces.set(modComponentId, set);
  set.add(nonce);
}

/**
 * Register a temporary display panel and wait fot its deferred promise
 * @param nonce The instance nonce for the panel to register
 * @param modComponentId The extension id that owns the panel
 * @param location The location of the panel
 * @param entry the panel definition
 * @param onRegister callback to run after the panel is registered
 */
export async function waitForTemporaryPanel({
  nonce,
  location,
  entry,
  modComponentId,
  onRegister,
}: {
  nonce: UUID;
  modComponentId: UUID;
  location: Location;
  entry: Except<TemporaryPanelEntry, "type">;
  onRegister?: () => void;
}): Promise<PanelAction | null> {
  if (panels.has(nonce)) {
    console.warn(
      `A temporary panel was already registered with nonce ${nonce}`,
    );
  }

  const registration =
    panels.get(nonce)?.registration ?? pDefer<PanelAction | null>();

  panels.set(nonce, {
    entry,
    location,
    modComponentId,
    registration,
  });

  const set = modComponentNonces.get(modComponentId) ?? new Set();
  modComponentNonces.set(modComponentId, set);
  set.add(nonce);

  onRegister?.();

  return registration.promise;
}

/**
 * Private helper method to remove panel from panels and extensionNonces.
 */
function removePanelEntry(panelNonce: UUID): void {
  const panel = panels.get(panelNonce);
  if (panel?.entry) {
    modComponentNonces
      .get(panel.entry.modComponentRef.modComponentId)
      ?.delete(panelNonce);
  }

  panels.delete(panelNonce);
}

/**
 * Resolve some temporary panels' deferred promises
 * @param nonces The nonces of the panels to resolve
 * @see resolveTemporaryPanel
 */
export async function stopWaitingForTemporaryPanels(nonces: UUID[]) {
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
  action: PanelAction,
): Promise<void> {
  panels.get(nonce)?.registration.resolve(action);
  panels.delete(nonce);
}

/**
 * Cancel some temporary panels' deferred promises
 * @param nonces The nonces of the panels to reject with a CancelError
 * @param error The error to reject the panels with
 */
export async function cancelTemporaryPanels(
  nonces: UUID[],
  error?: unknown,
): Promise<void> {
  let rejectError = error ?? new CancelError("User closed the panel");

  // :shrug: the error doesn't get deserialized by the messenger because it's not a rejection and the messenger
  // doesn't attempt to deserialize it. So we have to do it manually
  if (isObject(error) && "name" in error && error.name === "ClosePanelAction") {
    rejectError = new ClosePanelAction("User closed the panel");
  }

  for (const nonce of nonces) {
    panels.get(nonce)?.registration?.reject(rejectError);
    removePanelEntry(nonce);
  }
}

/**
 * Cancel all temporary panels for a given extension.
 * @see cancelTemporaryPanels
 */
export async function cancelTemporaryPanelsForExtension(
  modComponentId: UUID,
): Promise<void> {
  const nonces = modComponentNonces.get(modComponentId) ?? new Set();
  await cancelTemporaryPanels(
    [...nonces],
    new CancelError("Panel automatically closed"),
  );
}

/**
 * Cancel all temporary panels.
 */
export async function cancelAll(): Promise<void> {
  await cancelTemporaryPanels(
    [...panels.keys()],
    new CancelError("Panel automatically closed"),
  );
}
