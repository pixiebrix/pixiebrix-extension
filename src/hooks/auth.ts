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

import { getBaseURL } from "@/services/baseService";
import axios from "axios";
import urljoin from "url-join";

interface AuthState {
  userId: string;
  email: string;
  isLoggedIn: boolean;
  extension: boolean;
}

export async function getAuth(): Promise<AuthState> {
  const serviceUrl = await getBaseURL();
  const { data } = await axios.get(urljoin(serviceUrl, "api", "me", "/"));
  const { id, email } = data;
  if (id) {
    return {
      userId: id,
      email: email,
      isLoggedIn: true,
      extension: true,
    };
  } else {
    return {
      userId: undefined,
      email: undefined,
      isLoggedIn: false,
      extension: true,
    };
  }
}
