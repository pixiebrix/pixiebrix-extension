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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import { type Schema } from "../../types/schemaTypes";
import { getDiagnostics as collectFrameDiagnostics } from "../../contentScript/performanceMonitoring";
import { collectPerformanceDiagnostics as collectExtensionDiagnostics } from "../../background/messenger/api";
import { propertiesToSchema } from "../../utils/schemaUtils";

class ExtensionDiagnostics extends TransformerABC {
  override defaultOutputKey = "diagnostics";

  constructor() {
    super(
      "@pixiebrix/diagnostics",
      "Extension Diagnostics",
      "Collect PixieBrix performance and error diagnostics",
    );
  }

  inputSchema: Schema = propertiesToSchema({}, []);

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {},
    additionalProperties: true,
  };

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  async transform(): Promise<UnknownObject> {
    return {
      ...(await collectFrameDiagnostics()),
      ...(await collectExtensionDiagnostics()),
    };
  }
}

export default ExtensionDiagnostics;
