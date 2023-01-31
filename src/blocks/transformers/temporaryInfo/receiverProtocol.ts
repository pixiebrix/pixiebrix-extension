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
import { type TemporaryPanelEntry } from "@/sidebar/types";
import { remove } from "lodash";

let lastMessageSeen = -1;

export type PanelListener = {
  /**
   * Update an existing temporary panel, or NOP if the panel nonce doesn't exist.
   * @param panel the updated panel entry
   */
  onUpdateTemporaryPanel: (panel: TemporaryPanelEntry) => void;
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
  sequence: number,
  data: Parameters<PanelListener[Method]>[0],
  { force = false }: { force?: boolean } = {}
): void {
  if (sequence < lastMessageSeen && !force) {
    console.debug(
      "Skipping stale message (seq: %d, current: %d)",
      sequence,
      lastMessageSeen,
      { data }
    );
    return;
  }

  // Use Match.max to account for unordered messages with force
  lastMessageSeen = Math.max(sequence, lastMessageSeen);

  console.debug(`Running ${listeners.length} listener(s) for %s`, method, {
    data,
  });

  for (const listener of listeners) {
    try {
      // eslint-disable-next-line security/detect-object-injection -- method is keyof StoreListener
      listener[method](data);
    } catch (error) {
      reportError(error);
    }
  }
}

export async function updateTemporaryPanel(
  sequence: number,
  entry: TemporaryPanelEntry
) {
  runListeners("onUpdateTemporaryPanel", sequence, entry);
}
