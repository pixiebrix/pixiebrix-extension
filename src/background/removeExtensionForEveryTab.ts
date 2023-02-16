import {
  removeInstalledExtension,
  removeDynamicExtension,
  removeSidebar,
} from "@/contentScript/messenger/api";
import { forEachTabAsync } from "@/background/activeTab";
import { type UUID } from "@/core";
import { uninstallContextMenu } from "./contextMenus";
import { clearExtensionTraces } from "@/telemetry/trace";
import { clearLog } from "@/telemetry/logging";

export async function removeExtensionForEveryTab(
  extensionId: UUID
): Promise<void> {
  console.debug("Remove extension for all tabs", { extensionId });

  await forEachTabAsync(async (tab) => {
    removeInstalledExtension(tab, extensionId);
    removeDynamicExtension(tab, extensionId);
    await removeSidebar(tab, extensionId);
  });
  await uninstallContextMenu({ extensionId });
  await clearExtensionTraces(extensionId);
  await clearLog({ extensionId });
}
