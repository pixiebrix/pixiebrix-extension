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

import { hideNotification, showNotification } from "@/contentScript/notify";

const id = "connection-lost";

export function showConnectionLost(): void {
  showNotification({
    id,
    message: "Connection to PixieBrix lost. Please reload the page",
    type: "error",
    duration: Number.POSITIVE_INFINITY,
  });
}

export function hideConnectionLost(): void {
  hideNotification(id);
}
