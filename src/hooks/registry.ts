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

import { Registry, RegistryItem } from "@/baseRegistry";
import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { RegistryId } from "@/core";

export function useRegistry<Id extends RegistryId, T extends RegistryItem<Id>>(
  registry: Registry<Id, T>,
  id: Id
): T {
  const [result, setResult] = useState<T>();
  useAsyncEffect(
    async (isMounted) => {
      const result = await registry.lookup(id);
      if (!isMounted) {
        return;
      }

      setResult(result);
    },
    [registry, id]
  );
  return result;
}
