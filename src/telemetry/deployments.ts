import { IExtension } from "@/core";
import { JsonObject } from "type-fest";

/**
 * Select data to report to the team admins for the deployment
 */
export function selectEventData(
  extension: IExtension | null | undefined
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
