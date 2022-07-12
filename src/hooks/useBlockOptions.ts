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

import React, { useMemo, useState } from "react";
import genericOptionsFactory, {
  BlockOptionProps,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import { IBlock, RegistryId } from "@/core";
import blockRegistry from "@/blocks/registry";
import { useAsyncEffect } from "use-async-effect";
import reportError from "@/telemetry/reportError";
import optionsRegistry from "@/components/fields/optionsRegistry";

interface BlockState {
  block?: IBlock | null;
  error?: string | null;
}

function useBlockOptions(
  id: RegistryId
): [BlockState, React.FunctionComponent<BlockOptionProps>] {
  const [{ block, error }, setBlock] = useState<BlockState>({
    block: null,
    error: null,
  });

  useAsyncEffect(
    async (isMounted) => {
      console.log("useAsyncEffect", {
        id,
      });

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
    console.log("use memo", {
      id,
      blockId: block?.id,
    });

    // Only return the BlockOptions if 1) the block is available, 2) and it is actually the block with the requested id.
    // Must not return the BlockOptions for the previous block (when id has changed but the state hasn't been updated yet),
    // or the config parameters of the past block will become part of the configuration of the new block.
    if (id === block?.id) {
      const registered = optionsRegistry.get(block.id);
      return (
        registered ??
        genericOptionsFactory(
          block.inputSchema,
          undefined,
          block.inputValidationSchema
        )
      );
    }

    return null;
  }, [id, block?.id]);

  return [{ block, error }, BlockOptions];
}

export default useBlockOptions;
