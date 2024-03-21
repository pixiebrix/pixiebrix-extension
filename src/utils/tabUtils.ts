import { reactivateTab } from "@/contentScript/messenger/api";
import { forEachTab } from "./extensionUtils";

// XXX: It can be moved into `extensionUtils.ts` after `strictNullChecks` migration
export function reactivateEveryTab(): void {
  console.debug("Reactivate all tabs");
  void forEachTab(reactivateTab);
}
