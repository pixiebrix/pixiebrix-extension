import { IExtension, Metadata } from "@/core";
import { JsonObject } from "type-fest";

// FIXME: we have inconsistent typing of extensions, e.g., IExtension, InstalledExtension, ExtensionOptions. So handle
//  common shape without referencing those modules: https://github.com/pixiebrix/pixiebrix-extension/issues/893
type Extension = IExtension & { _recipe?: Metadata };

/**
 * Select data to report to the team admins for the deployment
 */
export function selectEventData(
  extension: Extension | null | undefined
): JsonObject {
  if (extension == null) {
    return {};
  }

  if (extension._deployment) {
    // For team deployments, include additional information so we can track use consistently across users. The extension
    // id changes on each activation, so we can't use that in correlating the reporting for end users
    return {
      label: extension.label,
      extensionId: extension.id,
      deploymentId: extension._deployment?.id,
      extensionPointId: extension.extensionPointId,
      blueprintId: extension._recipe?.id,
      blueprintVersion: extension._recipe?.version,
    };
  }

  return {
    extensionId: extension.id,
  };
}
