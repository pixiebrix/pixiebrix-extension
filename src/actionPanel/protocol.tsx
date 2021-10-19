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

import { reportError } from "@/telemetry/logging";
import { RegistryId, UUID } from "@/core";

export const MESSAGE_PREFIX = "@@pixiebrix/browserAction/";

export const RENDER_PANELS_MESSAGE = `${MESSAGE_PREFIX}RENDER_PANELS`;

let lastMessageSeen = -1;

/**
 * Information required to run a renderer
 */
export type RendererPayload = {
  blockId: RegistryId;
  key: string;
  args: unknown;
  ctxt: unknown;
};

export type RendererError = {
  key: string;
  error: string;
};

export type PanelEntry = {
  extensionId: UUID;
  extensionPointId: RegistryId;
  heading: string;
  payload: RendererPayload | RendererError | null;
};

export type ActionPanelStore = {
  panels: PanelEntry[];
};

type StoreListener = (store: ActionPanelStore) => void;

const listeners: StoreListener[] = [];

export function addListener(fn: StoreListener): void {
  if (listeners.includes(fn)) {
    console.warn("Listener already registered for action panel");
  } else {
    listeners.push(fn);
  }
}

export function removeListener(fn: StoreListener): void {
  listeners.splice(0, listeners.length, ...listeners.filter((x) => x !== fn));
}

export async function renderPanels(
  sequence: number,
  panels: PanelEntry[]
): Promise<void> {
  if (sequence < lastMessageSeen) {
    console.debug(
      "Skipping stale message (seq: %d, current: %d)",
      lastMessageSeen,
      sequence,
      panels
    );
    return;
  }

  lastMessageSeen = sequence;

  console.debug(
    `Running ${listeners.length} listener(s) for %s`,
    RENDER_PANELS_MESSAGE,
    { panels }
  );

  for (const listener of listeners) {
    try {
      listener({ panels });
    } catch (error: unknown) {
      reportError(error);
    }
  }
}
