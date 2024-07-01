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

import fs from "node:fs";
import brickRegistry from "@/bricks/registry";

// Import for side-effects (these modules register the blocks)
// NOTE: we don't need to also include extensionPoints because we got rid of all the legacy hard-coded extension points
// (e.g., the Pipedrive calendar extension point, and TechCrunch entity extension point)
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBricks from "@/contrib/registerContribBricks";

// Maintaining this number is a simple way to ensure bricks don't accidentally get dropped
const EXPECTED_HEADER_COUNT = 135;

registerBuiltinBricks();
registerContribBricks();

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

console.log(`version: ${process.env.npm_package_version}`);

const brickDefinitions = brickRegistry.builtins.map((brick) => ({
  apiVersion: "v1",
  header: true,
  kind: "read" in brick ? "reader" : "component",
  metadata: {
    id: brick.id,
    version: process.env.npm_package_version,
    name: brick.name,
    description: brick.description,
  },
  inputSchema: brick.inputSchema,
  outputSchema: brick.outputSchema,
}));

console.log(`Number of brick headers: ${brickDefinitions.length}`);

// Convert the following code to use test expectations
test("brick headers", () => {
  // If greater, did you forget to bump EXPECTED_HEADER_COUNT constant?
  // If lower, did you forget to register a brick definition?
  expect(brickDefinitions).toHaveLength(EXPECTED_HEADER_COUNT);

  fs.writeFileSync("headers.json", JSON.stringify(brickDefinitions));
  console.log("headers.json written to disk");
});
