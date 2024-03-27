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

import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";

function subscribe(update: VoidFunction) {
  browser.permissions.onAdded.addListener(update);
  browser.permissions.onRemoved.addListener(update);
  return () => {
    browser.permissions.onAdded.removeListener(update);
    browser.permissions.onRemoved.removeListener(update);
  };
}

async function getSnapshot() {
  return browser.permissions.getAll();
}

export default function useGrantedPermissions() {
  return useAsyncExternalStore(subscribe, getSnapshot);
}
