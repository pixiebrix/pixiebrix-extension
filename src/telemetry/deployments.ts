import { type ModComponentBase } from "@/types/modComponentTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import { type MessageContext } from "@/types/loggerTypes";
import { isRegistryId } from "@/types/helpers";

/**
 * Select data to report to the team admins for the deployment
 */
export function selectEventData(
  modComponent: Nullishable<ModComponentBase>,
): MessageContext {
  if (modComponent == null) {
    return {};
  }

  // For team deployments and blueprints, include additional information to track use consistently across installations.
  // The extension on each activation
  if (modComponent._deployment) {
    return {
      label: modComponent.label,
      modComponentId: modComponent.id,
      deploymentId: modComponent._deployment?.id,
      starterBrickId: isRegistryId(modComponent.extensionPointId)
        ? modComponent.extensionPointId
        : undefined,
      modId: modComponent._recipe?.id,
      modVersion: modComponent._recipe?.version,
    };
  }

  if (modComponent._recipe) {
    return {
      label: modComponent.label,
      modComponentId: modComponent.id,
      modId: modComponent._recipe?.id,
      modVersion: modComponent._recipe?.version,
    };
  }

  return {
    modComponentId: modComponent.id,
  };
}
