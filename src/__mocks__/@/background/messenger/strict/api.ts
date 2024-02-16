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

import { RegistryId } from "@/types/registryTypes";
import { getMethod, backgroundTarget as bg } from "webext-messenger";

export const registry = {
  syncRemote: jest.fn(),
  getByKinds: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockImplementation(async (id: RegistryId) => {
    throw new Error(
      `Find not implemented in registry mock (looking up "${id}"). See __mocks__/background/messenger/api for more information.`,
    );
  }),
  clear: getMethod("REGISTRY_CLEAR", bg),
};
