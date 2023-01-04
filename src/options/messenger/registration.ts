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

/* Do not use `getMethod` in this file; Keep only registrations here, not implementations */
import { registerMethods } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import notify from "@/utils/notify";

expectContext("extension");

declare global {
  interface MessengerMethods {
    NOTIFY_INFO: typeof notify.info;
    NOTIFY_ERROR: typeof notify.error;
    NOTIFY_SUCCESS: typeof notify.success;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    NOTIFY_INFO: notify.info,
    NOTIFY_ERROR: notify.error,
    NOTIFY_SUCCESS: notify.success,
  });
}
