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

import { type EffectCallback, useEffect } from "react";

/**
 * Dependency-free useEffect hook that runs the callback to only once on mount.
 *
 * NOTE: will be run 2x in development mode.
 * - https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-re-running-effects-in-development
 * - https://react.dev/learn/synchronizing-with-effects
 */
export default function useOnMountOnly(callback: EffectCallback): void {
  // Do not add dependencies here. If you need dependencies, use useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only meant to run once
  useEffect(callback, []);
}
