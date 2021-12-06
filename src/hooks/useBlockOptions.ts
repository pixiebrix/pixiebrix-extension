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

import React, { useMemo, useState } from "react";
import genericOptionsFactory, {
  BlockOptionProps,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import { IBlock, RegistryId } from "@/core";
import blockRegistry from "@/blocks/registry";
import { useAsyncEffect } from "use-async-effect";
import { reportError } from "@/telemetry/logging";
import optionsRegistry from "@/components/fields/optionsRegistry";

interface BlockState {
  block?: IBlock | null;
  error?: string | null;
}

export function useBlockOptions(
  id: RegistryId
): [BlockState, React.FunctionComponent<BlockOptionProps>] {
  const [{ block, error }, setBlock] = useState<BlockState>({
    block: null,
    error: null,
  });

  useAsyncEffect(
    async (isMounted) => {
      setBlock({ block: null, error: null });
      try {
        const block = await blockRegistry.lookup(id);
        if (!isMounted()) return;
        setBlock({ block });
      } catch (error) {
        reportError(error);
        if (!isMounted()) return;
        setBlock({ error: String(error) });
      }
    },
    [id, setBlock]
  );

  const BlockOptions = useMemo(() => {
    if (block?.id) {
      const registered = optionsRegistry.get(block.id);
      return registered ?? genericOptionsFactory(block.inputSchema);
    }

    return null;
  }, [block?.id, block?.inputSchema]);

  return [{ block, error }, BlockOptions];
}

export default useBlockOptions;
