import { reactivateTab } from "@/contentScript/messenger/api";
import { forEachTab } from "./extensionUtils";

// XXX: It can be moved into `extensionUtils.ts` after `strictNullChecks` migration
// https://github.com/pixiebrix/pixiebrix-extension/issues/6526
export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}
