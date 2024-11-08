import { type ModComponentBase } from "@/types/modComponentTypes";
import type { Nullishable } from "../utils/nullishUtils";
import { type MessageContext } from "@/types/loggerTypes";
import { isRegistryId } from "@/types/helpers";

/**
 * Select data to report to the team admins for the deployment.
 * @see mapModComponentRefToEventData
 */
export function selectEventData(
  modComponent: Nullishable<ModComponentBase>,
): MessageContext {
  if (modComponent == null) {
    return {};
  }

  // For team deployments and blueprints, include additional information to track use consistently across installations.
  // The extension on each activation
  if (modComponent.deploymentMetadata) {
    return {
      label: modComponent.label,
      modComponentId: modComponent.id,
      deploymentId: modComponent.deploymentMetadata.id,
      starterBrickId: isRegistryId(modComponent.extensionPointId)
        ? modComponent.extensionPointId
        : undefined,
      modId: modComponent.modMetadata.id,
      modVersion: modComponent.modMetadata.version,
    };
  }

  return {
    label: modComponent.label,
    modComponentId: modComponent.id,
    modId: modComponent.modMetadata.id,
    modVersion: modComponent.modMetadata.version,
  };
}
