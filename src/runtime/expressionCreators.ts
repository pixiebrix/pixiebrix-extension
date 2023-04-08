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

import { type BlockPipeline } from "@/blocks/types";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { Expression, TemplateEngine } from "@/types/runtimeTypes";

export function makeTemplateExpression(
  template: TemplateEngine,
  value: string
): Expression {
  return {
    __type__: template,
    __value__: value,
  };
}

export function makePipelineExpression(
  value: BlockPipeline
): PipelineExpression {
  return {
    __type__: "pipeline",
    __value__: value,
  };
}

export function makeVariableExpression(
  value: string
): Expression<string, "var"> {
  return {
    __type__: "var",
    __value__: value,
  };
}
