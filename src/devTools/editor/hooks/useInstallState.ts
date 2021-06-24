/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { IExtension } from "@/core";
import { FormState } from "@/devTools/editor/editorSlice";
import { useContext, useMemo } from "react";
import { DevToolsContext } from "@/devTools/context";
import { useAsyncState } from "@/hooks/common";
import {
  checkAvailable,
  getInstalledExtensionPointIds,
} from "@/background/devtools";
import { zip } from "lodash";
import hash from "object-hash";

export interface InstallState {
  installedIds: string[] | undefined;
  availableDynamicIds: Set<string> | undefined;
  unavailableCount: number | null;
}

function useInstallState(
  installed: IExtension[],
  elements: FormState[]
): InstallState {
  const {
    port,
    tabState: { navSequence, meta },
  } = useContext(DevToolsContext);

  const [installedIds] = useAsyncState(async () => {
    if (meta) {
      return getInstalledExtensionPointIds(port);
    } else {
      return [];
    }
  }, [port, navSequence, meta]);

  const [availableDynamicIds] = useAsyncState(async () => {
    if (meta) {
      const availability = await Promise.all(
        elements.map((element) =>
          checkAvailable(port, element.extensionPoint.definition.isAvailable)
        )
      );
      return new Set<string>(
        zip(elements, availability)
          .filter(([, available]) => available)
          .map(([extension]) => extension.uuid)
      );
    } else {
      return new Set<string>();
    }
  }, [
    port,
    meta,
    navSequence,
    hash(
      elements.map((x) => ({
        uuid: x.uuid,
        isAvailable: x.extensionPoint.definition.isAvailable,
      }))
    ),
  ]);

  const unavailableCount = useMemo(() => {
    if (meta) {
      if (installed && installedIds) {
        return installed.filter(
          (x) => !installedIds.includes(x.extensionPointId)
        ).length;
      } else {
        return null;
      }
    } else {
      return installed?.length;
    }
  }, [installed, installedIds, meta]);

  return { installedIds, availableDynamicIds, unavailableCount };
}

export default useInstallState;
