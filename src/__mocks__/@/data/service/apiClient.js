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

import ky from "ky";
// Re-export utility methods directly, skip automatic __mocks__ resolution #6799
export { absoluteApiUrl } from "../../../../data/service/apiClient";

// A mock of @/data/service/apiClient that doesn't use the local browser state. For use with msw in Storybook.
// See .storybook/preview.js for more information

const client = ky.create({
  prefixUrl: "https://app.pixiebrix.com",
  retry: 0,
});

export async function getLinkedApiClient() {
  return client;
}

export async function getApiClient() {
  return client;
}

export async function maybeGetApiClient() {
  return client;
}

export async function maybeGetLinkedApiClient() {
  return client;
}
