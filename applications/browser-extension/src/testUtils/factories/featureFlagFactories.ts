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

import { type FeatureFlag } from "../../auth/featureFlags";

let featureFlagId = 0;

/**
 * Assume a string is a feature flag for testing.
 */
export function UNSAFE_assumeFeatureFlag(flag: string): FeatureFlag {
  return flag as FeatureFlag;
}

/**
 * Test factory for creating feature flags.
 * @param baseName optional base name for the flag to improve test output readability.
 */
export function featureFlagFactory(baseName = "test-flag"): FeatureFlag {
  featureFlagId++;
  return UNSAFE_assumeFeatureFlag([baseName, featureFlagId].join("-"));
}
