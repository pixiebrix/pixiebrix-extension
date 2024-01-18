/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
 * @file This file provides Messenger to the strictNullChecks build.
 * It must not be imported.
 * The actual methods must be registered in the appropriate registration.ts file,
 * this is enforced by typescript itself as long as this file is never imported.
 * @see https://github.com/pixiebrix/pixiebrix-extension/issues/6526
 */

/* eslint-disable import/no-restricted-paths -- Type-only file */

import {
  type hideSidebar,
  type showSidebar,
} from "@/contentScript/sidebarController";

declare global {
  interface MessengerMethods {
    SHOW_SIDEBAR: typeof showSidebar;
    HIDE_SIDEBAR: typeof hideSidebar;
  }
}
