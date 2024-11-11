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

import {
  addAuthListener,
  getPartnerAuthData,
  removeAuthListener,
} from "@/auth/authStorage";
import { getBaseURL } from "@/data/service/baseService";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import { type AsyncState } from "@/types/sliceTypes";

// NOTE: can't share subscribe methods across generators currently for useAsyncExternalStore because it maintains
// a map of subscriptions to state controllers. See https://github.com/pixiebrix/pixiebrix-extension/issues/7789
const subscribe = (callback: () => void) => {
  addAuthListener(callback);

  return () => {
    removeAuthListener(callback);
  };
};

async function getAdminConsoleUrl(): Promise<string> {
  const [baseUrl, partnerAuth] = await Promise.all([
    getBaseURL(),
    getPartnerAuthData(),
  ]);
  const url = partnerAuth?.token
    ? new URL("partner-auth", baseUrl)
    : new URL(baseUrl);
  return url.toString();
}

/**
 * Hook to get the URL of the Admin Console based on URL overrides and partner authentication state.
 */
function useAdminConsoleUrl(): AsyncState<string> {
  // Need to update serviceURL on changes to partner auth data:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/4594
  return useAsyncExternalStore(subscribe, getAdminConsoleUrl);
}

export default useAdminConsoleUrl;
