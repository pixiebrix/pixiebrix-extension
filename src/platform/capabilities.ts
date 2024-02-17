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
const platformCapabilities = [
  // Access to a DOM
  "dom",
  // Access the host-page Javascript context
  "pageScript",
  // Access the host-page DOM
  "contentScript",
  // Show a blocking alert/prompt to the user
  "alert",
  // Show a blocking dialog to the user
  "dialog",
  // Show a non-blocking panel, e.g., in the Chromium side panel
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
  // PixieBrix icon, e.g., toolbar icon or standalone app favicon
  "icon",
  // Mod variables/page state
  "state",
  // Make API requests
  "http",
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
