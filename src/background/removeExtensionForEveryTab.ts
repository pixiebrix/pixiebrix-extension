import {
  removeInstalledExtension,
  clearDynamicElements,
  removeSidebars,
} from "@/contentScript/messenger/api";
import { forEachTab } from "@/utils/extensionUtils";
import { type UUID } from "@/types/stringTypes";
import { uninstallContextMenu } from "./contextMenus";
import { clearExtensionTraces } from "@/telemetry/trace";
import { clearLog } from "@/telemetry/logging";

export async function removeExtensionForEveryTab(
  extensionId: UUID
): Promise<void> {
  console.debug("Remove extension for all tabs", { extensionId });

  await forEachTab(async (tab) => {
    removeInstalledExtension(tab, extensionId);
    await clearDynamicElements(tab, { uuid: extensionId });
    await removeSidebars(tab, [extensionId]);
  });
  await uninstallContextMenu({ extensionId });
  await clearExtensionTraces(extensionId);
  await clearLog({ extensionId });
}
