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

/**
 * Shape of arguments passed to action generators for dynamic QuickBar action generator.
 *
 * @see DynamicQuickBarStarterBrickABC
 */
export type GeneratorArgs = {
  /**
   * Current user query in the QuickBar.
   */
  query: string;

  /**
   * Current selected root action id, or null if no root action is selected.
   */
  rootActionId: string | null;
};

/**
 * An action generator. The generator is expected to make calls QuickBarRegistry.addAction
 */
export type ActionGenerator = (
  args: GeneratorArgs & { abortSignal: AbortSignal },
) => Promise<void>;
