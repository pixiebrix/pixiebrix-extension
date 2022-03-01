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

import { IExtensionPoint } from "@/core";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { useAsyncState } from "@/hooks/common";
import extensionPointRegistry from "@/extensionPoints/registry";
import { zip } from "lodash";
import { checkAvailable } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";

function useAvailableExtensionPoints<
  TConfig extends IExtensionPoint & { rawConfig: ExtensionPointConfig }
  // We want Function to pass in the CTOR
  // eslint-disable-next-line @typescript-eslint/ban-types
>(ctor: Function): TConfig[] | null {
  const [availableExtensionPoints, , error] = useAsyncState(async () => {
    const all = await extensionPointRegistry.all();

    const withType = all.filter((x) => x instanceof ctor) as TConfig[];

    // For now, only support extension points defined with YAML/JSON. That's because we want to be able
    // to show the configuration in the page editor.
    const withConfig = withType.filter((x) => x.rawConfig != null);

    const availability = await Promise.allSettled(
      withConfig.map(async (x) =>
        checkAvailable(thisTab, x.rawConfig.definition.isAvailable ?? {})
      )
    );

    if (withType.length > 0 && withConfig.length === 0) {
      console.warn(
        `Internal: found ${withType.length} extension points, but none with a rawConfig. Is there a rawConfig property defined on the class?`
      );
    }

    console.debug("useAvailableExtensionPoints", {
      withType,
      withConfig,
      availability,
    });

    return zip(withConfig, availability)
      .filter(
        ([, availability]) =>
          availability.status === "fulfilled" && availability.value
      )
      .map(([extensionPoint]) => extensionPoint);
  }, []);

  if (error) {
    console.error("useAvailableExtensionPoints", { error });
  }

  return availableExtensionPoints;
}

export default useAvailableExtensionPoints;
