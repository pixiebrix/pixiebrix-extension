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

import { type Action } from "kbar";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";

/**
 * `kbar` action with additional metadata about the source of the action.
 */
export type CustomAction = Action & {
  /**
   * The extension point that added this action.
   */
  extensionPointId?: RegistryId;
  /**
   * The IExtension that added the action.
   * @see IExtension
   */
  extensionId?: UUID;
};

/**
 * Handler for when the set of registered actions changes
 *
 * @see QuickBarRegistry.addListener
 * @see QuickBarRegistry.removeListener
 */
export type ActionsChangeHandler = (activeActions: CustomAction[]) => void;

/**
 * Shape of arguments passed to action generators for dynamic QuickBar action generator.
 *
 * @see QuickBarProviderExtensionPoint
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
  args: GeneratorArgs & { abortSignal: AbortSignal }
) => Promise<void>;
