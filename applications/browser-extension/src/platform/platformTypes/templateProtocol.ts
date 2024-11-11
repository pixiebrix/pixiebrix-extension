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

import type { JsonObject } from "type-fest";

/**
 * The template for text templates, currently using nunjucks and handlebars.
 * @since 1.8.10
 */
export interface TemplateProtocol {
  render: (args: {
    engine: "nunjucks" | "handlebars";
    template: string;
    context: JsonObject;
    autoescape: boolean;
  }) => Promise<string>;

  // Must also provide a "validate" because nunjucks uses function constructor for compiling the template
  validate: (args: { engine: "nunjucks"; template: string }) => Promise<void>;
}
