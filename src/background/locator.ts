/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import LazyLocatorFactory from "@/services/locator";
import { liftBackground } from "@/background/protocol";
import { isBackgroundPage } from "webext-detect-page";

export const locator = new LazyLocatorFactory();

async function initLocator() {
  await locator.refresh();
}

export const locate = liftBackground(
  "LOCATE_SERVICE",
  (serviceId: string, id: string | null) => locator.locate(serviceId, id)
);

export const refresh: () => Promise<unknown> = liftBackground(
  "REFRESH_SERVICES",
  () => locator.refresh(),
  {
    asyncResponse: false,
  }
);

if (isBackgroundPage()) {
  initLocator().then(() => {
    console.debug("Eagerly initialized service locator");
  });
}
