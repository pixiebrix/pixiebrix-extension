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

import { fetch } from "@/hooks/fetch";
import { AuthState } from "@/core";

interface ProfileResponse {
  readonly id: string;
  readonly email: string;
  readonly scope: string | null;
}

export const anonAuth: AuthState = {
  userId: undefined,
  email: undefined,
  isLoggedIn: false,
  extension: true,
  scope: null,
};

export async function getAuth(): Promise<AuthState> {
  const { id, email, scope } = await fetch<ProfileResponse>("/api/me/");
  if (id) {
    return {
      userId: id,
      email,
      scope,
      isLoggedIn: true,
      extension: true,
    };
  } else {
    return anonAuth;
  }
}
