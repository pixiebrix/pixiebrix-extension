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

  // For team deployments and blueprints, include additional information to track use consistently across installations.
  // The extension on each activation
  if (extension._deployment) {
    return {
      label: extension.label,
      extensionId: extension.id,
      deploymentId: extension._deployment?.id,
      extensionPointId: extension.extensionPointId,
      blueprintId: extension._recipe?.id,
      blueprintVersion: extension._recipe?.version,
    };
  }

  if (extension._recipe) {
    return {
      label: extension.label,
      extensionId: extension.id,
      blueprintId: extension._recipe?.id,
      blueprintVersion: extension._recipe?.version,
    };
  }

  return {
    extensionId: extension.id,
  };
}
