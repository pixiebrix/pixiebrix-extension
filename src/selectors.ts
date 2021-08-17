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

import { useMemo } from "react";
import extensionPointRegistry from "@/extensionPoints/registry";
import { useSelector } from "react-redux";
import { IExtension, IExtensionPoint, RegistryId, UUID } from "@/core";
import { useAsyncState } from "@/hooks/common";
import { selectExtensions } from "@/options/selectors";
import { resolveDefinitions } from "@/registry/internal";

interface ExtensionResult {
  extensionPoint: IExtensionPoint | null;
  extensionConfig: IExtension;
  isPending: boolean;
}

export function useExtension(
  extensionPointId: RegistryId,
  extensionId: UUID
): ExtensionResult {
  console.debug("useExtension", { extensionPointId, extensionId });

  const extensions = useSelector(selectExtensions);

  const match = useMemo(() => {
    if (!extensionId) {
      // There will be no match if no extensionId is provided (i.e., when creating a new extension via the workshop GUI
      return null;
    }

    const config = extensions.find((x) => x.id === extensionId);

    if (!config) {
      throw new Error(
        `Could not locate configuration for extension: ${extensionId}`
      );
    }

    return config;
  }, [extensions, extensionId]);

  const [extensionPoint, isPending] = useAsyncState(async () => {
    if (match) {
      // There will be no match if no extensionId is provided (i.e., when creating a new extension via the workshop GUI
      const extension = await resolveDefinitions(match);
      return extensionPointRegistry.lookup(extension.extensionPointId);
    }

    return extensionPointRegistry.lookup(extensionPointId);
  }, [extensionPointRegistry, match, extensionPointId]);

  return { extensionPoint, extensionConfig: match, isPending };
}
