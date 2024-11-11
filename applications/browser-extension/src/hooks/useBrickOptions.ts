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

import type React from "react";
import { useMemo, useState } from "react";
import genericOptionsFactory, {
  type BrickOptionProps,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import brickRegistry from "@/bricks/registry";
import { useAsyncEffect } from "use-async-effect";
import reportError from "@/telemetry/reportError";
import optionsRegistry from "@/components/fields/optionsRegistry";
import { type RegistryId } from "@/types/registryTypes";
import { type Brick, isUserDefinedBrick } from "@/types/brickTypes";

interface BrickState {
  brick?: Brick | null;
  error?: string | null;
}

function useBrickOptions(
  id: RegistryId,
): [BrickState, React.FunctionComponent<BrickOptionProps> | null] {
  const [{ brick, error }, setBrick] = useState<BrickState>({
    brick: null,
    error: null,
  });

  useAsyncEffect(
    async (isMounted) => {
      setBrick({ brick: null, error: null });
      try {
        const brick = await brickRegistry.lookup(id);
        if (!isMounted()) {
          return;
        }

        setBrick({ brick });
      } catch (error) {
        reportError(error);
        if (!isMounted()) {
          return;
        }

        setBrick({ error: String(error) });
      }
    },
    [id, setBrick],
  );

  const BrickOptions = useMemo(() => {
    // Only return the BrickOptions if 1) the brick is available, 2) and it is actually the brick with the requested id.
    // Must not return the BrickOptions for the previous brick (when id has changed but the state hasn't been updated yet),
    // or the config parameters of the past brick will become part of the configuration of the new brick.
    if (id === brick?.id) {
      const registered = optionsRegistry.get(brick.id);
      return (
        registered ??
        genericOptionsFactory(brick.inputSchema, brick.uiSchema, {
          // Preserve order for JS-based bricks. We can trust the order because JS literals preserve dictionary order
          preserveSchemaOrder: !isUserDefinedBrick(brick),
        })
      );
    }

    return null;
  }, [id, brick]);

  return [{ brick, error }, BrickOptions];
}

export default useBrickOptions;
