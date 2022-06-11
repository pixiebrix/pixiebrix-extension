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

import { isTemplateExpression } from "@/runtime/mapArgs";

function usesTemplateDirectives(value: string): boolean {
  return value.includes("{{") || value.includes("{%");
}

export function trySelectStringLiteral(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    // Already a string literal
    return value;
  }

  if (isTemplateExpression(value) && !usesTemplateDirectives(value.__value__)) {
    return value.__value__;
  }

  return null;
}
