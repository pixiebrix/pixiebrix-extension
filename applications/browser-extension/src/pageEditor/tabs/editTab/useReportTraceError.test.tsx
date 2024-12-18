/* eslint-disable @typescript-eslint/ban-ts-comment -- Flaky error */
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

import React from "react";
import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import { initialState as editorInitialState } from "@/store/editorInitialState";
import runtimeSlice from "@/pageEditor/store/runtime/runtimeSlice";
import sessionSlice from "@/pageEditor/store/session/sessionSlice";
import { configureStore } from "@reduxjs/toolkit";
import { type TraceRecord } from "@/telemetry/trace";
import { uuidv4 } from "@/types/helpers";
import reportEvent from "@/telemetry/reportEvent";
import useReportTraceError from "./useReportTraceError";
import { Provider } from "react-redux";

import {
  traceErrorFactory,
  traceRecordFactory,
} from "@/testUtils/factories/traceFactories";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { renderHook } from "@/testUtils/renderWithCommonStore";

// Override the manual mock to support `expect` assertions
jest.mock("@/telemetry/reportEvent");

const renderUseReportTraceError = (traces: TraceRecord[] = []) => {
  const activeModComponentId = uuidv4();

  const getTestStore = (testTraces: TraceRecord[]) =>
    // @ts-ignore-error -- ignoring "Type instantiation is excessively deep and possibly infinite" for test
    configureStore({
      // @ts-ignore-error -- ignoring "Type instantiation is excessively deep and possibly infinite" for test
      reducer: {
        session: sessionSlice.reducer,
        editor: editorSlice.reducer,
        runtime: runtimeSlice.reducer,
      },
      preloadedState: {
        editor: {
          ...editorInitialState,
          activeModComponentId,
        },
        runtime: {
          modComponentTraces: {
            [activeModComponentId]: testTraces,
          },
        },
      },
    });

  return renderHook(
    (_rerenderProps: { rerenderTraces?: TraceRecord[] }) => {
      useReportTraceError();
    },
    {
      wrapper: ({ children, rerenderTraces }) => (
        <Provider store={getTestStore(rerenderTraces || traces)}>
          {children}
        </Provider>
      ),
    },
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useReportTraceError", () => {
  it("reports an error", () => {
    renderUseReportTraceError([traceErrorFactory()]);
    expect(reportEvent).toHaveBeenCalledWith(
      "PageEditorExtensionError",
      expect.anything(),
    );
  });

  test("doesn't report when no error", () => {
    renderUseReportTraceError([traceRecordFactory()]);
    expect(reportEvent).not.toHaveBeenCalledWith();
  });

  test("doesn't report when error does not have a run id", () => {
    renderUseReportTraceError([traceErrorFactory({ runId: null })]);
    expect(reportEvent).not.toHaveBeenCalledWith();
  });

  test("reports error from the same run id only once", () => {
    const errorTrace = traceErrorFactory({ runId: uuidSequence(1) });
    const { rerender } = renderUseReportTraceError([errorTrace]);

    // Re-render the hook
    rerender({ rerenderTraces: [errorTrace] });

    expect(reportEvent).toHaveBeenCalledTimes(1);

    // Re-render the hook with a different error, but same run id
    rerender({
      rerenderTraces: [traceErrorFactory({ runId: errorTrace.runId })],
    });

    expect(reportEvent).toHaveBeenCalledTimes(1);

    // Re-render the hook with a different run id
    rerender({
      rerenderTraces: [traceErrorFactory({ runId: uuidSequence(2) })],
    });

    expect(reportEvent).toHaveBeenCalledTimes(2);
  });
});
