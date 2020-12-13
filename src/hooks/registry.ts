/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Registry, { RegistryItem } from "@/baseRegistry";
import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";

export function useRegistry<T extends RegistryItem>(
  registry: Registry<T>,
  id: string
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
