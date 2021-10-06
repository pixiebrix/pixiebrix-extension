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
import { loadOptions } from "@/options/loader";
import { IExtension, ResolvedExtension } from "@/core";
import { resolveDefinitions } from "@/registry/internal";
import { allSettledValues } from "@/utils";
import { expectContext } from "@/utils/expectContext";
import { isDeploymentActive } from "@/options/deploymentUtils";
import { compact, uniq } from "lodash";
// NOTE: Call the method directly, don't go through the messenger API
import { ensureContextMenu } from "@/background/contextMenus";

// Adapted from ContextMenuExtensionPoint.ensureMenu
// There's a bug in webext-messenger where message from the background page to itself aren't being delivered
// https://github.com/pixiebrix/pixiebrix-extension/issues/1542
async function ensureMenu(
  extensionPoint: ContextMenuExtensionPoint,
  extension: ResolvedExtension<ContextMenuConfig>
): Promise<void> {
  expectContext("background");

  const { title } = extension.config;

  // Check for null/undefined to preserve backward compatability
  if (!isDeploymentActive(extension)) {
    return;
  }

  const patterns = compact(
    uniq([
      ...extensionPoint.documentUrlPatterns,
      ...(extensionPoint.permissions?.origins ?? []),
    ])
  );

  console.debug(
    "ensureContextMenu for %s: %s (%s)",
    extensionPoint,
    extension.id,
    extension.label ?? "No Label",
    {
      patterns,
    }
  );

  // NOTE: Call the method directly, don't go through the messenger API
  await ensureContextMenu({
    extensionId: extension.id,
    contexts: extensionPoint.contexts ?? ["all"],
    title,
    documentUrlPatterns: patterns,
  });
}

async function preload(extensions: IExtension[]): Promise<void> {
  expectContext("background");
  await Promise.allSettled(
    extensions.map(async (definition) => {
      const resolved = await resolveDefinitions(definition);

      const extensionPoint = await extensionPointRegistry.lookup(
        resolved.extensionPointId
      );
      if (extensionPoint instanceof ContextMenuExtensionPoint) {
        await ensureMenu(
          extensionPoint,
          resolved as ResolvedExtension<ContextMenuConfig>
        );
      }
    })
  );
}

export const preloadContextMenus = liftBackground(
  "PRELOAD_CONTEXT_MENUS",
  async ({ extensions }: { extensions: IExtension[] }) => {
    await preload(extensions);
  }
);

async function preloadAllContextMenus(): Promise<void> {
  const { extensions } = await loadOptions();
  const resolved = await allSettledValues(
    extensions.map(async (x) => resolveDefinitions(x))
  );
  await preload(resolved);
}

export default (): void => {
  expectContext("background");
  void preloadAllContextMenus();
};
