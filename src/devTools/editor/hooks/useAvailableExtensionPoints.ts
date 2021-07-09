/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { IExtensionPoint } from "@/core";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { useContext } from "react";
import { DevToolsContext } from "@/devTools/context";
import { useAsyncState } from "@/hooks/common";
import extensionPointRegistry from "@/extensionPoints/registry";
import { checkAvailable } from "@/background/devtools";
import { zip } from "lodash";

function useAvailableExtensionPoints<
  TConfig extends IExtensionPoint & { rawConfig: ExtensionPointConfig }
  // we want Function to pass in the CTOR
  // eslint-disable-next-line @typescript-eslint/ban-types
>(ctor: Function): TConfig[] | null {
  const { port } = useContext(DevToolsContext);

  const [availableExtensionPoints, , error] = useAsyncState(async () => {
    const all = await extensionPointRegistry.all();
    const validExtensionPoints = all.filter(
      (x) => x instanceof ctor && (x as TConfig).rawConfig != null
    ) as TConfig[];
    const availability = await Promise.allSettled(
      validExtensionPoints.map((x) =>
        checkAvailable(port, x.rawConfig.definition.isAvailable ?? {})
      )
    );
    console.debug("useAvailableExtensionPoints", {
      all,
      validExtensionPoints,
      availability,
    });
    return zip(validExtensionPoints, availability)
      .filter(
        ([, availability]) =>
          availability.status === "fulfilled" && availability.value === true
      )
      .map(([extensionPoint]) => extensionPoint);
  }, [port]);

  if (error) {
    console.warn("useAvailableExtensionPoints", { error });
  }

  return availableExtensionPoints;
}

export default useAvailableExtensionPoints;
