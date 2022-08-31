/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
 * @file Automatically catch and prevent all native `submit` events in extension:// pages
 * https://github.com/pixiebrix/pixiebrix-extension/issues/3275
 * https://github.com/pixiebrix/pixiebrix-extension/issues/3879
 * https://github.com/pixiebrix/pixiebrix-extension/issues/4122
 */
import { isWebPage } from "webext-detect-page";

function preventDefault(event: Event): void {
  event.preventDefault();
  console.debug("The native submission of the form has been prevented");
}

if (!isWebPage()) {
  document.addEventListener("submit", preventDefault);
}
