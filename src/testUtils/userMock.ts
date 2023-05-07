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

import { type Me } from "@/types/contract";
import { appApi } from "@/services/api";
import {
  queryLoadingFactory,
  querySuccessFactory,
} from "@/testUtils/rtkQueryFactories";
import { userFactory } from "@/testUtils/factories";

// Instead of monkey-patching RTK Query's Redux State, we might want to instead encourage using setupRedux
// in the render helper?

// In existing code, there was a lot of places mocking both useQueryState and useGetMeQuery. This could in some places
// yield impossible states due to how `skip` logic in calls like RequireAuth, etc.

export function mockAnonymousUser(): void {
  (appApi.endpoints.getMe as any).useQueryState = jest.fn(() =>
    querySuccessFactory({})
  );
}

export function mockLoadingUser(): void {
  (appApi.endpoints.getMe as any).useQueryState = jest.fn(() =>
    queryLoadingFactory()
  );
}

export function mockCachedUser(me?: Me): void {
  (appApi.endpoints.getMe as any).useQueryState = jest.fn(() =>
    querySuccessFactory(me ?? userFactory())
  );
}
