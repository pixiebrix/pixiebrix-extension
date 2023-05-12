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

import { define, type FactoryConfig } from "cooky-cutter";
import { type TraceError, type TraceRecord } from "@/telemetry/trace";
import {
  timestampFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import objectHash from "object-hash";
import { type RenderedArgs } from "@/types/runtimeTypes";
import { type BlockConfig } from "@/blocks/types";
import { validateRegistryId } from "@/types/helpers";

const TEST_BLOCK_ID = validateRegistryId("testing/block-id");

export const traceRecordFactory = define<TraceRecord>({
  timestamp: timestampFactory,
  extensionId: uuidSequence,
  runId: uuidSequence,
  branches(): TraceRecord["branches"] {
    return [];
  },
  // XXX: callId should be derived from branches
  callId: objectHash([]),
  blockInstanceId: uuidSequence,
  blockId: TEST_BLOCK_ID,
  templateContext(): TraceRecord["templateContext"] {
    return {};
  },
  renderedArgs(): RenderedArgs {
    return {} as RenderedArgs;
  },
  renderError: null,
  blockConfig(): BlockConfig {
    return {
      id: TEST_BLOCK_ID,
      config: {},
    };
  },
});
export const traceErrorFactory = (config?: FactoryConfig<TraceRecord>) =>
  traceRecordFactory({
    error: {
      message: "Trace error for tests",
    },
    skippedRun: false,
    isFinal: true,
    isRenderer: false,
    ...config,
  }) as TraceError;
