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

import fs from "fs";
import blockRegistry from "@/blocks/registry";

// Maintaining this number is a simple way to ensure bricks don't accidentally get dropped
const EXPECTED_HEADER_COUNT = 102;

// Import for side-effects (these modules register the blocks)
// NOTE: we don't need to also include extensionPoints because we got rid of all the legacy hard-coded extension points
// (e.g., the Pipedrive calendar extension point, and TechCrunch entity extension point)
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";

registerBuiltinBlocks();
registerContribBlocks();

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

console.log(`version: ${process.env.NPM_PACKAGE_VERSION}`);

const blockDefinitions = blockRegistry.cached().map((block) => ({
  apiVersion: "v1",
  header: true,
  kind: "read" in block ? "reader" : "component",
  metadata: {
    id: block.id,
    version: process.env.NPM_PACKAGE_VERSION,
    name: block.name,
    description: block.description,
    author: block.author,
  },
  inputSchema: block.inputSchema,
  outputSchema: block.outputSchema,
}));

console.log(`Number of block headers: ${blockDefinitions.length}`);

if (blockDefinitions.length === 0) {
  throw new Error("No block definitions generated");
}

if (blockDefinitions.length > EXPECTED_HEADER_COUNT) {
  throw new Error(
    `Expected ${EXPECTED_HEADER_COUNT} block definitions. Actual: ${blockDefinitions.length}. Did you forget to bump the EXPECTED_HEADER_COUNT constant?`
  );
}

if (blockDefinitions.length < EXPECTED_HEADER_COUNT) {
  throw new Error(
    `Expected ${EXPECTED_HEADER_COUNT} block definitions. Actual: ${blockDefinitions.length}. Did you forget to register a block definition?`
  );
}

fs.writeFileSync("headers.json", JSON.stringify(blockDefinitions));

console.log("headers.json written to disk");
