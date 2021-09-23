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

import { liftBackground } from "@/background/protocol";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
} from "@/extensionPoints/contextMenu";
import { reportError } from "@/telemetry/logging";
import { loadOptions } from "@/options/loader";
import { IExtension, ResolvedExtension } from "@/core";
import { resolveDefinitions } from "@/registry/internal";
import { allSettledValues } from "@/utils";

async function preload(extensions: IExtension[]): Promise<void> {
  await Promise.all(
    extensions.map(async (definition) => {
      const resolved = await resolveDefinitions(definition);

      const extensionPoint = await extensionPointRegistry.lookup(
        resolved.extensionPointId
      );
      if (extensionPoint instanceof ContextMenuExtensionPoint) {
        try {
          await extensionPoint.ensureMenu(
            (definition as unknown) as ResolvedExtension<ContextMenuConfig>
          );
        } catch (error: unknown) {
          reportError(error);
        }
      }
    })
  );
}

export const preloadMenus = liftBackground(
  "PRELOAD_CONTEXT_MENUS",
  async ({ extensions }: { extensions: IExtension[] }) => {
    await preload(extensions);
  }
);

export async function preloadAllMenus(): Promise<void> {
  const { extensions } = await loadOptions();
  const resolved = await allSettledValues(
    extensions.map(async (x) => resolveDefinitions(x))
  );
  await preload(resolved);
}

export default (): void => {
  void preloadAllMenus();
};
