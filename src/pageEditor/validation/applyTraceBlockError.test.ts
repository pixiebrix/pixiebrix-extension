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

import { traceErrorFactory } from "@/testUtils/factories";
import applyTraceBlockError from "./applyTraceBlockError";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { get } from "lodash";

// Test root pipeline and sub pipeline (path corresponds to storage config of a Custom Form in a Document)
test.each(["0", "0.config.body.1.config.pipeline.__value__.0.config.recordId"])(
  "sets block error",
  (blockPath) => {
    const pipelineErrors: FormikErrorTree = {};
    const errorTraceEntry = traceErrorFactory();

    applyTraceBlockError(pipelineErrors, errorTraceEntry, blockPath);

    expect(get(pipelineErrors, blockPath)).toBe(errorTraceEntry.error.message);
  }
);

test("doesn't override nested error", () => {
  const errorTraceEntry = traceErrorFactory();
  const blockPath = "5";

  const nestedBlockError = {
    config: {
      name: "Nested Error",
    },
  };
  const pipelineErrors = {
    [blockPath]: nestedBlockError,
  };

  applyTraceBlockError(pipelineErrors, errorTraceEntry, blockPath);

  expect(pipelineErrors[blockPath]).toBe(nestedBlockError);
});
