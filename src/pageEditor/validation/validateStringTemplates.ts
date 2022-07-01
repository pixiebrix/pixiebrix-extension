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

import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { BlockPipeline } from "@/blocks/types";
import { isEmpty } from "lodash";
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import { UnknownObject } from "@/types";
import { joinName, joinPathParts } from "@/utils";
import { traversePipeline } from "@/pageEditor/utils";
import { setPipelineBlockError } from "./setPipelineBlockError";

const MUSTACHE_ERROR_MESSAGE =
  "Invalid string template. Read more about string templates: https://docs.pixiebrix.com/nunjucks-templates";

function validateObject(
  config: UnknownObject,
  namePath: string,
  errors: FormikErrorTree
) {
  for (const [prop, value] of Object.entries(config)) {
    if (
      isTemplateExpression(value) &&
      value.__type__ !== "mustache" &&
      isMustacheOnly(value.__value__)
    ) {
      // We should use 'joinName' here b/c the form fields can have special chars
      setPipelineBlockError(
        errors,
        MUSTACHE_ERROR_MESSAGE,
        joinName(namePath, prop)
      );
    } else if (typeof value === "object" && !isExpression(value)) {
      validateObject(value as UnknownObject, joinName(namePath, prop), errors);
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

  traversePipeline({
    pipeline,
    visitBlock({ blockConfig, path }) {
      validateObject(
        blockConfig.config,
        joinPathParts(path, "config"),
        pipelineErrors
      );
    },
  });
}

export default validateStringTemplates;
