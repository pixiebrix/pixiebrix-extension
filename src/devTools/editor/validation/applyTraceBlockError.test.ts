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

import { traceErrorFactory } from "@/tests/factories";
import applyTraceBlockError from "./applyTraceBlockError";
import { FormikErrorTree } from "@/devTools/editor/tabs/editTab/editTabTypes";

test("sets block error", () => {
  const pipelineErrors: FormikErrorTree = {};
  const errorTraceEntry = traceErrorFactory();

  applyTraceBlockError(pipelineErrors, errorTraceEntry, 0);

  expect(pipelineErrors[0]).toBe(errorTraceEntry.error.message);
});

test("doesn't override nested error", () => {
  const errorTraceEntry = traceErrorFactory();
  const blockIndex = 5;

  const nestedBlockError = {
    config: {
      name: "Nested Error",
    },
  };
  const pipelineErrors = {
    [blockIndex]: nestedBlockError,
  };

  applyTraceBlockError(pipelineErrors, errorTraceEntry, blockIndex);

  // eslint-disable-next-line security/detect-object-injection
  expect(pipelineErrors[blockIndex]).toBe(nestedBlockError);
});
