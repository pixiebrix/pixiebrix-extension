import type { PlatformProtocol } from "@/platform/platformProtocol";
import type { ElementReference } from "@/types/runtimeTypes";

/**
 * @file Extended platform protocol for content scripts.
 */

/**
 * Extended platform protocol for content scripts.
 * @since 2.2.0
 * @see isContentScriptPlatformProtocol
 */
export interface ContentScriptPlatformProtocol extends PlatformProtocol {
  /**
   * Prompt the user to select one or more elements on a host page.
   * @since 1.8.10
   */
  userSelectElementRefs: () => Promise<ElementReference[]>;
}

/**
 * Returns true if platforms is the extended content script platform implementation.
 */
export function isContentScriptPlatformProtocol(
  platform: PlatformProtocol,
): platform is ContentScriptPlatformProtocol {
  return "userSelectElementRefs" in platform;
}
