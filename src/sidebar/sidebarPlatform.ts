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

import { PlatformABC } from "@/platform/platformProtocol";
import { showNotification } from "@/utils/notify";
import type { PlatformCapability } from "@/platform/capabilities";

/**
 * Sidebar platform capabilities. In general, brick execution occurs in the context of the host page.
 */
class SidebarPlatform extends PlatformABC {
  override capabilities: PlatformCapability[] = ["dom", "alert", "toast"];

  override alert = window.alert;
  override prompt = window.prompt;
  override notify = showNotification;
}

const sidebarPlatform = new SidebarPlatform();
export default sidebarPlatform;
