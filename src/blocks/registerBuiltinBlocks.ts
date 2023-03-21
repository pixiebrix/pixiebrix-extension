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

import getAllEffects from "./effects/getAllEffects";
import getAllTransformers from "./transformers/getAllTransformers";
import getAllRenderers from "./renderers/getAllRenderers";
import getAllReaders, {
  registerReaderFactories,
} from "@/blocks/readers/getAllReaders";
import blockRegistry from "@/blocks/registry";

let registered = false;

function registerBuiltinBlocks() {
  if (registered) {
    console.warn(
      "registerBuiltinBlocks already called; multiple calls are unnecessary and may impact startup performance"
    );
  }

  blockRegistry.register([
    ...getAllTransformers(),
    ...getAllEffects(),
    ...getAllRenderers(),
    ...getAllReaders(),
  ]);

  registerReaderFactories();

  registered = true;
}

export default registerBuiltinBlocks;
