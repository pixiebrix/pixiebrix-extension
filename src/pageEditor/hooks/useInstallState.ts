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

import { IExtension, UUID } from "@/core";
import { useContext } from "react";
import { PageEditorTabContext } from "@/pageEditor/context";
import { useAsyncState } from "@/hooks/common";
import { compact } from "lodash";
import hash from "object-hash";
import { resolveDefinitions } from "@/registry/internal";
import { getCurrentURL, thisTab } from "@/pageEditor/utils";
import {
  checkAvailable,
  getInstalledExtensionPoints,
} from "@/contentScript/messenger/api";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { QuickBarExtensionPoint } from "@/extensionPoints/quickBarExtension";
import { testMatchPatterns } from "@/blocks/available";
import { isQuickBarExtensionPoint } from "@/pageEditor/extensionPoints/formStateTypes";

export interface InstallState {
  availableInstalledIds: Set<UUID> | undefined;
  availableDynamicIds: Set<UUID> | undefined;
  unavailableCount: number | null;
}

function useInstallState(
  extensions: IExtension[],
  elements: FormState[]
): InstallState {
  const {
    tabState: { navSequence, meta, error },
  } = useContext(PageEditorTabContext);

  const [availableInstalledIds] = useAsyncState(
    async () => {
      if (meta && !error) {
        const installedExtensionPoints = new Map(
          // eslint-disable-next-line unicorn/no-await-expression-member
          (await getInstalledExtensionPoints(thisTab)).map((extensionPoint) => [
            extensionPoint.id,
            extensionPoint,
          ])
        );
        const resolved = await Promise.all(
          extensions.map(async (extension) => resolveDefinitions(extension))
        );
        const tabUrl = await getCurrentURL();
        const availableExtensionPointIds = resolved
          .filter((x) => {
            const extensionPoint = installedExtensionPoints.get(
              x.extensionPointId
            );
            // Not installed means not available
            if (extensionPoint == null) {
              return false;
            }

            // QuickBar is installed on every page, need to filter by the documentUrlPatterns
            if (
              QuickBarExtensionPoint.isQuickBarExtensionPoint(extensionPoint)
            ) {
              return testMatchPatterns(
                extensionPoint.documentUrlPatterns,
                tabUrl
              );
            }

            return true;
          })
          .map((x) => x.id);

        return new Set<UUID>(
          extensions
            .filter((x) => availableExtensionPointIds.includes(x.id))
            .map((x) => x.id)
        );
      }

      return new Set<UUID>();
    },
    [navSequence, meta, error, extensions],
    new Set<UUID>()
  );

  const [availableDynamicIds] = useAsyncState(
    async () => {
      // At this point, if the extensionPoint is an inner extension point (without its own id), then it will have
      // been expanded to extensionPoint
      if (meta && !error) {
        const tabUrl = await getCurrentURL();
        const availableElementIds = await Promise.all(
          elements.map(
            async ({ uuid, extensionPoint: elementExtensionPoint }) => {
              const isAvailable = isQuickBarExtensionPoint(
                elementExtensionPoint
              )
                ? testMatchPatterns(
                    elementExtensionPoint.definition.documentUrlPatterns,
                    tabUrl
                  )
                : await checkAvailable(
                    thisTab,
                    elementExtensionPoint.definition.isAvailable
                  );

              return isAvailable ? uuid : null;
            }
          )
        );

        return new Set<UUID>(compact(availableElementIds));
      }

      return new Set<UUID>();
    },
    [
      meta,
      error,
      navSequence,
      hash(
        elements.map((x) => ({
          uuid: x.uuid,
          isAvailable: x.extensionPoint.definition.isAvailable,
          documentUrlPatterns:
            // Including the documentUrlPatterns in the hash from any extension point type that actually has them
            (x.extensionPoint.definition as { documentUrlPatterns?: string[] })
              ?.documentUrlPatterns ?? "",
        }))
      ),
    ],
    new Set<UUID>()
  );

  return {
    availableInstalledIds,
    availableDynamicIds,
    unavailableCount: meta
      ? extensions.length - (availableInstalledIds?.size ?? 0)
      : null,
  };
}

export default useInstallState;
