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

import reportError from "@/telemetry/reportError";
import { type TemporaryPanelEntry } from "@/types/sidebarTypes";
import { remove } from "lodash";
import { type UUID, type TimedSequence } from "@/types/stringTypes";
import { getTimedSequence } from "@/types/helpers";

let lastMessageSeen = getTimedSequence();

export type PanelListener = {
  /**
   * Update an existing temporary panel, or NOP if the panel nonce doesn't exist.
   * @param panel the updated panel entry
   */
  onUpdateTemporaryPanel: (panel: TemporaryPanelEntry) => void;

  /**
   * Update the panel nonce for an existing frame.
   * @param frameNonce
   * @param panelNonce
   */
  onSetPanelNonce: ({
    frameNonce,
    panelNonce,
  }: {
    frameNonce: UUID;
    panelNonce: UUID;
  }) => void;
};

const listeners: PanelListener[] = [];

export function addListener(fn: PanelListener): void {
  if (listeners.includes(fn)) {
    console.warn("Listener already registered for panel");
  } else {
    listeners.push(fn);
  }
}

export function removeListener(fn: PanelListener): void {
  remove(listeners, (x) => x === fn);
}

function runListeners<Method extends keyof PanelListener>(
  method: Method,
  timestamp: TimedSequence,
  data: Parameters<PanelListener[Method]>[0],
  { force = false }: { force?: boolean } = {},
): void {
  if (timestamp < lastMessageSeen && !force) {
    console.debug(
      "Skipping stale message (seq: %d, current: %d)",
      timestamp,
      lastMessageSeen,
      { data },
    );
    return;
  }

  // Account for unordered messages with force
  lastMessageSeen = timestamp > lastMessageSeen ? timestamp : lastMessageSeen;

  console.debug(`Running ${listeners.length} listener(s) for %s`, method, {
    data,
  });

  for (const listener of listeners) {
    try {
      // @ts-expect-error -- TODO: improve typings
      // eslint-disable-next-line security/detect-object-injection -- method is keyof StoreListener
      listener[method](data);
    } catch (error) {
      reportError(error);
    }
  }
}

export async function updateTemporaryPanel(
  timestamp: TimedSequence,
  entry: TemporaryPanelEntry,
) {
  runListeners("onUpdateTemporaryPanel", timestamp, entry);
}

export async function setTemporaryPanelNonce(
  timestamp: TimedSequence,
  payload: { frameNonce: UUID; panelNonce: UUID },
) {
  runListeners("onSetPanelNonce", timestamp, payload);
}
