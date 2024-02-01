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
 * Make sure you add the methods you need to ./typeOnlyMessengerRegistration.ts
 * @see https://github.com/pixiebrix/pixiebrix-extension/issues/6526
 */

import { getMethod } from "webext-messenger";

export const showSidebar = getMethod("SHOW_SIDEBAR");
export const hideSidebar = getMethod("HIDE_SIDEBAR");
export const showMySidePanel = getMethod("SHOW_MY_SIDE_PANEL");
