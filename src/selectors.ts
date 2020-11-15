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

import { useMemo } from "react";
import extensionPointRegistry from "@/extensionPoints/registry";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import { IExtensionPoint } from "@/core";
import { ExtensionOptions } from "@/options/slices";
import { useAsyncState } from "@/hooks/common";

interface ExtensionResult {
  extensionPoint: IExtensionPoint | null;
  extensionConfig: ExtensionOptions;
  isPending: boolean;
}

export function useExtension(
  extensionPointId: string,
  extensionId: string
): ExtensionResult {
  console.debug("useExtension", { extensionPointId, extensionId });

  const options = useSelector((state: RootState) => state.options);

  const extensionConfig = useMemo(() => {
    let config;

    if (!extensionId) {
      return null;
    } else if (extensionPointId) {
      config = options.extensions[extensionPointId][extensionId];
    } else {
      for (const pointExtensions of Object.values(options.extensions)) {
        const pointConfig = pointExtensions[extensionId];
        if (pointConfig) {
          config = pointConfig;
          break;
        }
      }
    }
    if (!config) {
      throw new Error(
        `Could not locate configuration for extension ${extensionId}`
      );
    }
    return config;
  }, [options, extensionId, extensionPointId]);

  const [extensionPoint, isPending] = useAsyncState(async () => {
    if (extensionConfig) {
      return await extensionPointRegistry.lookup(
        extensionConfig.extensionPointId
      );
    } else if (extensionPointId) {
      return await extensionPointRegistry.lookup(extensionPointId);
    }
    return null;
  }, [extensionPointRegistry, extensionConfig, extensionPointId]);

  return { extensionPoint, extensionConfig, isPending };
}
