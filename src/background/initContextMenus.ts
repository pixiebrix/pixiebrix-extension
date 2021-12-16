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

import extensionPointRegistry from "@/extensionPoints/registry";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
} from "@/extensionPoints/contextMenu";
import { loadOptions } from "@/options/loader";
import { IExtension, ResolvedExtension } from "@/core";
import { resolveDefinitions } from "@/registry/internal";
import { allSettledValues } from "@/utils";
import { expectContext } from "@/utils/expectContext";

export async function preloadContextMenus(
  extensions: IExtension[]
): Promise<void> {
  expectContext("background");
  await Promise.allSettled(
    extensions.map(async (definition) => {
      const resolved = await resolveDefinitions(definition);

      const extensionPoint = await extensionPointRegistry.lookup(
        resolved.extensionPointId
      );
      if (extensionPoint instanceof ContextMenuExtensionPoint) {
        await extensionPoint.ensureMenu(
          (definition as unknown) as ResolvedExtension<ContextMenuConfig>
        );
      }
    })
  );
}

async function preloadAllContextMenus(): Promise<void> {
  const { extensions } = await loadOptions();
  const resolved = await allSettledValues(
    extensions.map(async (x) => resolveDefinitions(x))
  );
  await preloadContextMenus(resolved);
}

export default function initContextMenus(): void {
  expectContext("background");
  void preloadAllContextMenus();
}
