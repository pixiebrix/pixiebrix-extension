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

type PanelDefinition = {
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
 * @param nonce the panel nonce
 */
function useTemporaryPanelDefinition(
  target: Target,
  nonce: UUID
): PanelDefinition {
  const [entry, isLoading, error] = useAsyncState(
    async () => getPanelDefinition(target, nonce),
    [nonce]
  );

  return {
    entry,
    isLoading,
    error,
  };
}

export default useTemporaryPanelDefinition;
