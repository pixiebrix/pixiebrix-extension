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

import React from "react";
import {
  editorSlice,
  initialState as editorInitialState,
} from "@/pageEditor/slices/editorSlice";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import sessionSlice from "@/pageEditor/slices/sessionSlice";
import { configureStore, Store } from "@reduxjs/toolkit";
import { TraceRecord } from "@/telemetry/trace";
import { uuidv4 } from "@/types/helpers";
import { reportEvent } from "@/telemetry/events";
import { renderHook } from "@testing-library/react-hooks";
import useReportTraceError from "./useReportTraceError";
import { Provider } from "react-redux";
import { traceErrorFactory, traceRecordFactory } from "@/testUtils/factories";

jest.mock("@/telemetry/events", () => ({
  reportEvent: jest.fn(),
}));

const renderUseReportTraceError = (traces: TraceRecord[] = []) => {
  const activeElementId = uuidv4();

  const store: Store = configureStore({
    reducer: {
      session: sessionSlice.reducer,
      editor: editorSlice.reducer,
      runtime: runtimeSlice.reducer,
    },
    preloadedState: {
      editor: {
        ...editorInitialState,
        activeElementId,
      },
      runtime: {
        extensionTraces: {
          [activeElementId]: traces,
        },
      },
    },
  });

  return renderHook(
    () => {
      useReportTraceError();
    },
    {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    }
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("it reports an error", () => {
  renderUseReportTraceError([traceErrorFactory()]);
  expect(reportEvent).toHaveBeenCalledWith(
    "PageEditorExtensionError",
    expect.anything()
  );
});

test("doesn't report when no error", () => {
  renderUseReportTraceError([traceRecordFactory()]);
  expect(reportEvent).not.toHaveBeenCalledWith();
});

test("reports the same error only once", () => {
  const { rerender } = renderUseReportTraceError([traceErrorFactory()]);

  // Re-render the hook
  rerender();

  expect(reportEvent).toHaveBeenCalledTimes(1);
});
