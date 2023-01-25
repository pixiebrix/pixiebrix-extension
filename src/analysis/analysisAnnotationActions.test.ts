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

import {
  createAnalysisAnnotationAction,
  getCallbackForAnalysisAction,
} from "@/analysis/analysisAnnotationActions";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";

describe("analysisAnnotationActions", () => {
  test("create annotation action without callback", () => {
    const action = createAnalysisAnnotationAction({
      caption: "test caption",
      type: AnalysisAnnotationActionType.AddValueToArray,
      path: "test.path",
      value: "test value",
    });

    expect(action).toEqual({
      annotationActionId: expect.any(String),
      caption: "test caption",
      type: AnalysisAnnotationActionType.AddValueToArray,
      path: "test.path",
      value: "test value",
    });
  });

  test("create annotation action with callback", async () => {
    const testCallback = jest.fn();

    const action = createAnalysisAnnotationAction(
      {
        caption: "test caption",
        type: AnalysisAnnotationActionType.AddValueToArray,
        path: "test.path",
        value: "test value",
      },
      testCallback
    );

    expect(action).toEqual({
      annotationActionId: expect.any(String),
      caption: "test caption",
      type: AnalysisAnnotationActionType.AddValueToArray,
      path: "test.path",
      value: "test value",
    });

    await getCallbackForAnalysisAction(action.annotationActionId)();
    expect(testCallback).toHaveBeenCalledOnce();

    // Callback should be cleared after it's called
    expect(getCallbackForAnalysisAction(action.annotationActionId)).toBeNull();
  });
});
