import {
  removeInstalledExtension,
  clearDynamicElements,
} from "@/contentScript/messenger/api";
import { removeSidebars } from "@/contentScript/messenger/strict/api";
import { forEachTab } from "@/utils/extensionUtils";
import { type UUID } from "@/types/stringTypes";
import { uninstallContextMenu } from "./contextMenus";
import { clearExtensionTraces } from "@/telemetry/trace";
import { clearLog } from "@/telemetry/logging";

export async function removeExtensionForEveryTab(
  extensionId: UUID,
): Promise<void> {
  console.debug("Remove extension for all tabs", { extensionId });

  await forEachTab(async ({ tabId }) => {
    const allFrames = { tabId, frameId: "allFrames" } as const;
    removeInstalledExtension(allFrames, extensionId);
    clearDynamicElements(allFrames, { uuid: extensionId });
    await removeSidebars({ tabId }, [extensionId]);
  });
  await uninstallContextMenu({ extensionId });
  await clearExtensionTraces(extensionId);
  await clearLog({ extensionId });
}
