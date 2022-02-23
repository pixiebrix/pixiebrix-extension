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
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import { UnknownObject } from "@/types";
import { joinName } from "@/utils";

const MUSTACHE_ERROR_MESSAGE =
  "Invalid string template. <a href='https://docs.pixiebrix.com/nunjucks-templates'>Read more about string templates.</a>";

function validateObject(
  config: UnknownObject,
  namePath: string,
  errors: FormikErrorTree
) {
  // eslint-disable-next-line guard-for-in
  for (const prop in config) {
    const propNamePath = joinName(namePath, prop);
    // eslint-disable-next-line security/detect-object-injection -- iterating through props
    const value = config[prop];
    if (
      isTemplateExpression(value) &&
      value.__type__ !== "mustache" &&
      isMustacheOnly(value.__value__)
    ) {
      set(errors, propNamePath, MUSTACHE_ERROR_MESSAGE);
    } else if (typeof value === "object" && !isExpression(value)) {
      validateObject(value as UnknownObject, propNamePath, errors);
    }
  }
}

function validateStringTemplates(
  pipelineErrors: FormikErrorTree,
  pipeline: BlockPipeline
) {
  if (isEmpty(pipeline)) {
    return;
  }

  for (const [index, block] of pipeline.entries()) {
    validateObject(
      block.config,
      joinName(index.toString(), "config"),
      pipelineErrors
    );
  }
}

export default validateStringTemplates;
