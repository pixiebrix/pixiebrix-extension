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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type UUID } from "@/types/stringTypes";
import { type TraceRecord } from "@/telemetry/trace";
import { type RuntimeState } from "@/pageEditor/slices/runtimeSliceTypes";

const initialState: RuntimeState = {
  extensionTraces: {},
};

const runtimeSlice = createSlice({
  name: "runtime",
  initialState,
  reducers: {
    setExtensionTrace(
      state,
      { payload }: PayloadAction<{ extensionId: UUID; records: TraceRecord[] }>
    ) {
      const { extensionId, records } = payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Immer's writable draft in combination with TraceRecord[] produce TS error: type instantiation is excessively deep and possibly infinite
      state.extensionTraces[extensionId] = records as any;
    },
  },
});

export default runtimeSlice;
