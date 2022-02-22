/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { FormikErrorTree } from "@/devTools/editor/tabs/editTab/editTabTypes";
import { BlockPipeline } from "@/blocks/types";
import { isEmpty, set } from "lodash";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";

const MUSTACHE_ERROR_MESSAGE =
  "Mustache syntax is not supported, please use nunjucks template syntax";

function validateStringTemplates(
  pipelineErrors: FormikErrorTree,
  pipeline: BlockPipeline
) {
  if (isEmpty(pipeline)) {
    return;
  }

  for (const [index, block] of pipeline.entries()) {
    // eslint-disable-next-line guard-for-in
    for (const prop in block.config) {
      // eslint-disable-next-line security/detect-object-injection
      const value = block.config[prop];
      if (
        isTemplateExpression(value) &&
        value.__type__ !== "mustache" &&
        isMustacheOnly(value.__value__)
      ) {
        const propNamePath = `${index}.config.${prop}`;
        set(pipelineErrors, propNamePath, MUSTACHE_ERROR_MESSAGE);
      }
    }
  }
}

export default validateStringTemplates;
