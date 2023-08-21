import { type ModComponentBase } from "@/types/modComponentTypes";
import { type JsonObject } from "type-fest";

/**
 * Select data to report to the team admins for the deployment
 */
export function selectEventData(
  modComponent: ModComponentBase | null | undefined
): JsonObject {
  if (modComponent == null) {
    return {};
  }

  // For team deployments and blueprints, include additional information to track use consistently across installations.
  // The extension on each activation
  if (modComponent._deployment) {
    return {
      label: modComponent.label,
      extensionId: modComponent.id,
      deploymentId: modComponent._deployment?.id,
      extensionPointId: modComponent.extensionPointId,
      blueprintId: modComponent._recipe?.id,
      blueprintVersion: modComponent._recipe?.version,
    };
  }

  if (modComponent._recipe) {
    return {
      label: modComponent.label,
      extensionId: modComponent.id,
      blueprintId: modComponent._recipe?.id,
      blueprintVersion: modComponent._recipe?.version,
    };
  }

  return {
    extensionId: modComponent.id,
  };
}
