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

import { type Args, mapArgs, type MapOptions } from "../../runtime/mapArgs";
import { type Except } from "type-fest";
import extendModVariableContext from "../../runtime/extendModVariableContext";
import { expectContext } from "../../utils/expectContext";
import { type ModComponentRef } from "../../types/modComponentTypes";

/**
 * Run `mapArgs` in the contentScript.
 *
 *`mapArgs` should not be run in an extension context because the extension context is privileged. (You'll also get
 * a CSP error about 'unsafe-eval' if using nunjucks or an engine that uses eval under the hood
 *
 * Requires `apiVersion: 3` or later because MapOptions.implicitRender is not supported (because you can't pass
 * functions across message boundaries).
 *
 * Future work:
 * - In Chrome, execute this in the sandbox: https://github.com/pixiebrix/pixiebrix-extension/issues/105
 *
 * @see mapArgs
 */
export async function runMapArgs({
  config,
  modComponentRef,
  context,
  options,
}: {
  config: Args;
  context: UnknownObject;
  modComponentRef: ModComponentRef;
  options: Except<MapOptions, "implicitRender"> & {
    /**
     * True to extend the context with the mod variable.
     * @since 1.7.34
     */
    extendModVariable: boolean;
  };
}): Promise<unknown> {
  expectContext("contentScript");

  const extendedContext = await extendModVariableContext(context, {
    modComponentRef,
    options,
    // The mod variable is only update when running a brick in a pipeline. It's not updated for `defer` expressions,
    // e.g., when rendering items for a ListElement in the Document Builder.
    update: false,
  });

  return mapArgs(config, extendedContext, { ...options, implicitRender: null });
}
