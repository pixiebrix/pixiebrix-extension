/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Capabilities a platform may provide to extensions/plug-ins/add-ins/userscripts.
 */
export const platformCapabilities = [
  // Access to a DOM - but not necessarily visible to a user
  "dom",
  // Access the host-page Javascript context
  "pageScript",
  // Access the host-page DOM
  "contentScript",
  // Show a blocking alert/prompt to the user
  "alert",
  // Show a form to a user
  "form",
  // Show a panel to a user
  "panel",
  // Show a non-blocking notification/toast
  "toast",
  // Run sandboxed Javascript code. Sandboxed JS does not have access to the DOM.
  "sandbox",
  // Write to the clipboard
  "clipboardWrite",
  // Play known sound effects
  "audio",
  // PixieBrix quick bar or, eventually, the native app's command palette
  "quickBar",
  // PixieBrix selection tooltip or, eventually, the native app's native selection tooltip
  "selectionTooltip",
  // Context menu
  "contextMenu",
  // PixieBrix badge, e.g., toolbar icon or standalone app favicon
  "badge",
  // Mod variables/page state
  "state",
  // Access to open URLs/links
  "link",
  // Make API requests
  "http",
  // Render a template
  "template",
] as const;

export type PlatformCapability = (typeof platformCapabilities)[number];

/**
 * Capabilities required to run commands in the DOM context of a host page.
 */
export const CONTENT_SCRIPT_CAPABILITIES: PlatformCapability[] = [
  "contentScript",
  "dom",
] as const;

/**
 * Capabilities required to run commands in the JS context of a host page.
 */
export const PAGE_SCRIPT_CAPABILITIES: PlatformCapability[] = [
  ...CONTENT_SCRIPT_CAPABILITIES,
  "pageScript",
] as const;

/**
 * Runtime Error indicating a capability is not available on the platform.
 */
export class PlatformCapabilityNotAvailable extends Error {
  override name = "PlatformCapabilityNotAvailable";

  constructor(capability: PlatformCapability) {
    super("Capability not available for platform: " + capability);
  }
}
