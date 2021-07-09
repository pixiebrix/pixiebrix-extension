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

import { liftBackground } from "@/background/protocol";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
} from "@/extensionPoints/contextMenu";
import { reportError } from "@/telemetry/logging";
import { loadOptions } from "@/options/loader";

interface PreloadOptions<TConfig = Record<string, unknown>> {
  id: string;
  extensionPointId: string;
  config: TConfig;
}

async function preload(extensions: PreloadOptions[]): Promise<void> {
  for (const definition of extensions) {
    const extensionPoint = await extensionPointRegistry.lookup(
      definition.extensionPointId
    );
    if (extensionPoint instanceof ContextMenuExtensionPoint) {
      try {
        await extensionPoint.ensureMenu(
          (definition as unknown) as PreloadOptions<ContextMenuConfig>
        );
      } catch (error) {
        reportError(error);
      }
    }
  }
}

export const preloadMenus = liftBackground(
  "PRELOAD_CONTEXT_MENUS",
  async ({ extensions }: { extensions: PreloadOptions[] }) => {
    await preload(extensions);
  }
);

export async function preloadAllMenus(): Promise<void> {
  const { extensions: extensionPointConfigs } = await loadOptions();
  const extensions: PreloadOptions[] = Object.entries(extensionPointConfigs)
    .flatMap(([, xs]) => Object.values(xs))
    .filter((x) => x.active);
  await preload(extensions);
}

export default (): void => {
  void preloadAllMenus();
};
