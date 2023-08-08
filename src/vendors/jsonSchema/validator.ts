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

import { dereference } from "./dereference";
import { Schema, SchemaDraft } from "./types";
import { validate } from "./validate";

export class Validator {
  private readonly lookup: ReturnType<typeof dereference>;

  constructor(
    private readonly schema: Schema | boolean,
    private readonly draft: SchemaDraft = "2019-09",
    private readonly shortCircuit = true
  ) {
    this.lookup = dereference(schema);
  }

  public validate(instance: any) {
    return validate(
      instance,
      this.schema,
      this.draft,
      this.lookup,
      this.shortCircuit
    );
  }

  public addSchema(schema: Schema, id?: string) {
    if (id) {
      schema = { ...schema, $id: id };
    }
    dereference(schema, this.lookup);
  }
}
