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

import { type RegistryId } from "@/types/registryTypes";

/**
 * @file This file contains helper functions for generating routes in the Extension Console. Other contexts can
 * also use these methods to generate deep links.
 */

/**
 * Returns the Extension Console hash route to activate a mod in the Extension Console.
 */
export function getActivateModHashRoute(modId: RegistryId): string {
  return `/marketplace/activate/${encodeURIComponent(modId)}`;
}
