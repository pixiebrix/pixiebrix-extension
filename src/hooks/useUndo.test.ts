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

import { act, renderHook } from "@testing-library/react-hooks";
import useUndo from "@/hooks/useUndo";

jest.useFakeTimers();

describe("useUndo", () => {
  test("undo last typed text", () => {
    let realValue = "";
    const { result } = renderHook(() =>
      useUndo("", (value) => {
        realValue = value;
      })
    );

    act(() => {
      // Simulate a user typing into an input
      result.current.setUndoableValue("a");
      result.current.setUndoableValue("ab");
      result.current.setUndoableValue("abc");
      // Run timers to fire debounce
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc");

    act(() => {
      result.current.setUndoableValue("abc ");
      result.current.setUndoableValue("abc d");
      result.current.setUndoableValue("abc de");
      result.current.setUndoableValue("abc def");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc def");

    act(() => {
      result.current.undo();
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc");
  });

  test("undo deleted text", () => {
    let realValue = "";
    const { result } = renderHook(() =>
      useUndo("", (value) => {
        realValue = value;
      })
    );

    act(() => {
      result.current.setUndoableValue("abc def");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc def");

    act(() => {
      // Delete the input value like a user would
      result.current.setUndoableValue("abc de");
      result.current.setUndoableValue("abc d");
      result.current.setUndoableValue("abc ");
      result.current.setUndoableValue("abc");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc");

    act(() => {
      result.current.setUndoableValue("ab");
      result.current.setUndoableValue("a");
      result.current.setUndoableValue("");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("");

    act(() => {
      result.current.undo();
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc");

    act(() => {
      result.current.undo();
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc def");
  });

  test("handles newlines", () => {
    let realValue = "";
    const { result } = renderHook(() =>
      useUndo("", (value) => {
        realValue = value;
      })
    );

    act(() => {
      result.current.setUndoableValue("abc def");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc def");

    act(() => {
      result.current.setUndoableValue("abc def\n\naaa\nbbb");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc def\n\naaa\nbbb");

    act(() => {
      result.current.undo();
    });
    expect(realValue).toStrictEqual("abc def");

    act(() => {
      result.current.undo();
    });
    expect(realValue).toStrictEqual("");
  });

  test("typing between undos", () => {
    let realValue = "";
    const { result } = renderHook(() =>
      useUndo("", (value) => {
        realValue = value;
      })
    );

    act(() => {
      result.current.setUndoableValue("abc");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("abc");

    act(() => {
      result.current.undo();
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("");

    act(() => {
      result.current.setUndoableValue("def");
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("def");

    act(() => {
      result.current.undo();
      jest.runAllTimers();
    });
    expect(realValue).toStrictEqual("");
  });
});
