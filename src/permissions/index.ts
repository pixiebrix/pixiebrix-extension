import extensionRegistry from "@/extensionPoints/registry";
import { distinctPermissions } from "@/blocks/available";
import { requestPermissions } from "@/chrome";
import { useAsyncEffect } from "use-async-effect";
import { useState, useCallback } from "react";
import every from "lodash/every";
import { IExtension, IPermissions } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import Permissions = chrome.permissions.Permissions;

/**
 * Request any permissions the user has not already granted
 * @param permissionsList
 * @returns {Promise<boolean>}
 */
export async function ensureAllPermissions(
  permissionsList: IPermissions[]
): Promise<boolean> {
  for (const permission of permissionsList) {
    if (!(await checkPermission(permission))) {
      const { permissions = [], origins = [] } = permission;
      const granted = await requestPermissions(permissions, origins);
      if (!granted) {
        return false;
      }
    }
  }
  return true;
}

export async function ensureRecipePermissions(
  recipe: RecipeDefinition
): Promise<boolean> {
  const extensionPermissions = recipe.extensionPoints.map(({ id }) => {
    const extensionPoint = extensionRegistry.lookup(id);
    return extensionPoint.permissions;
  });
  return await ensureAllPermissions(distinctPermissions(extensionPermissions));
}

/**
 * Return distinct browser permissions required to run the extension.
 * @param extension
 * @returns {*}
 */
export function extensionPermissions(extension: IExtension) {
  const { extensionPointId } = extension;
  const extensionPoint = extensionRegistry.lookup(extensionPointId);
  const blockPermissions = extensionPoint
    .getBlocks(extension)
    .map((x) => x.permissions);
  return distinctPermissions([extensionPoint.permissions, ...blockPermissions]);
}

function checkPermission(permission: Permissions): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.contains(permission, resolve);
  });
}

export async function permissionsEnabled(
  extension: IExtension<object>
): Promise<boolean> {
  const permissions = extensionPermissions(extension);
  return every(await Promise.all(permissions.map(checkPermission)));
}

export async function ensureExtensionPermissions(
  extension: IExtension<object>
) {
  const permissions = extensionPermissions(extension);
  return await ensureAllPermissions(permissions);
}

export function useExtensionPermissions(
  extension: IExtension<object>
): [boolean | undefined, () => Promise<void>] {
  const [enabled, setEnabled] = useState(undefined);

  useAsyncEffect(
    async (mounted) => {
      try {
        const result = await permissionsEnabled(extension);
        if (!mounted()) return;
        setEnabled(result);
      } catch (ex) {
        // If there's an error checking permissions, just assume they're OK. The use will
        // need to fix the configuration before we can check permissions.
        setEnabled(true);
      }
    },
    [extension]
  );

  const request = useCallback(async () => {
    setEnabled(await ensureExtensionPermissions(extension));
  }, [extension]);

  return [enabled, request];
}
