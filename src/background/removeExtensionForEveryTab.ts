import {
  removeInstalledExtension,
  clearDynamicElements,
  removeSidebar,
} from "@/contentScript/messenger/api";
import { forEachTabAsync } from "@/background/activeTab";
import { type UUID } from "@/types/stringTypes";
import { uninstallContextMenu } from "./contextMenus";
import { clearExtensionTraces } from "@/telemetry/trace";
import { clearLog } from "@/telemetry/logging";

export async function removeExtensionForEveryTab(
  extensionId: UUID
): Promise<void> {
  console.debug("Remove extension for all tabs", { extensionId });

  await forEachTabAsync(async (tab) => {
    removeInstalledExtension(tab, extensionId);
    await clearDynamicElements(tab, { uuid: extensionId });
    await removeSidebar(tab, extensionId);
  });
  await uninstallContextMenu({ extensionId });
  await clearExtensionTraces(extensionId);
  await clearLog({ extensionId });
}
