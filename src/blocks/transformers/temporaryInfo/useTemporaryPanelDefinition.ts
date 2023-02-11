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

import { useAsyncState } from "@/hooks/common";
import { getPanelDefinition } from "@/contentScript/messenger/api";
import { type UUID } from "@/core";
import { type TemporaryPanelEntry } from "@/sidebar/types";
import { type Target } from "@/types";
import { useEffect, useState } from "react";
import {
  addListener,
  type PanelListener,
  removeListener,
} from "@/blocks/transformers/temporaryInfo/receiverProtocol";
import { validateUUID } from "@/types/helpers";

type PanelDefinition = {
  /**
   * The current panel nonce.
   */
  panelNonce: UUID | null;

  /**
   * The current panel entry.
   */
  entry: TemporaryPanelEntry;
  /**
   * True if the panel definition is being retrieved for the first time.
   */
  isLoading: boolean;
  /**
   * Error if the panel definition could not be retrieved, or null on isLoading or success
   */
  error: unknown;
};

/**
 * Hook to get the panel definition for a given nonce, and watch for definition updates.
 * @param target The target contentScript managing the panel
 * @param initialNonce the initial panelNonce to show
 */
function useTemporaryPanelDefinition(
  target: Target,
  initialNonce: UUID
): PanelDefinition {
  const params = new URLSearchParams(location.search);
  const frameNonce = validateUUID(params.get("frameNonce"));

  const [panelNonce, setNonce] = useState(initialNonce);

  const [entry, isLoading, error, recalculate] = useAsyncState(async () => {
    if (panelNonce) {
      return getPanelDefinition(target, panelNonce);
    }

    // Blank panel, e.g., pre-allocated iframe
    return null;
  }, [panelNonce]);

  useEffect(() => {
    const listener: PanelListener = {
      onUpdateTemporaryPanel(newEntry) {
        console.debug("onUpdateTemporaryPanel", newEntry);
        // Need to verify we're the panel of interest, because messenger broadcasts to all ephemeral panels
        if (newEntry.nonce === panelNonce) {
          // Slightly inefficient to getPanelDefinition because the entry is available in the message. However, this
          // is the cleaner use of useAsyncState
          void recalculate();
        }
      },
      onSetPanelNonce(payload) {
        // Need to verify we're the panel of interest, because messenger broadcasts to all ephemeral panels
        if (
          frameNonce &&
          payload.frameNonce === frameNonce &&
          panelNonce !== payload.panelNonce
        ) {
          // Changing the nonce will cause useAsyncState to recalculate
          console.debug("onSetPanelNonce", payload);
          setNonce(payload.panelNonce);
        }
      },
    };

    addListener(listener);

    return () => {
      removeListener(listener);
    };
  }, [frameNonce, panelNonce, recalculate]);

  return {
    panelNonce,
    entry,
    isLoading,
    error,
  };
}

export default useTemporaryPanelDefinition;
