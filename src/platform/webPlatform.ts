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
import { getState, setState } from "@/platform/state/pageState";
import type { PlatformCapability } from "@/platform/capabilities";

class WebPlatform extends PlatformABC {
  override capabilities: PlatformCapability[] = [
    "dom",
    "alert",
    "sandbox",
    "toast",
    "dialog",
    "panel",
    "clipboardWrite",
    "state",
  ];

  // Running unbound window methods throws Invocation Error
  override alert = window.alert.bind(window);
  override prompt = window.prompt.bind(window);

  override notify = showNotification;

  override get state() {
    return {
      getState,
      setState,
    };
  }
}

/**
 * Platform for web extensions running in the content script.
 */
const webPlatform = new WebPlatform();
export default webPlatform;
