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

describe("useUndo", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test("undo last typed text", () => {
    let value = "";
    const setValue = (newValue: string) => {
      value = newValue;
    };

    // We will need to rerender the hook between changes, since the value input comes
    // from this variable outside the hook render.
    const { result: undoRef, rerender } = renderHook(() =>
      useUndo(value, setValue)
    );

    act(() => {
      // Simulate a user typing into an input
      setValue("a");
      setValue("ab");
      setValue("abc");
      // Update the hook
      rerender();
      // Run timers to activate the debounce effect
      jest.runAllTimers();
    });

    expect(value).toStrictEqual("abc");

    act(() => {
      setValue("abc ");
      setValue("abc d");
      setValue("abc de");
      setValue("abc def");
      rerender();
      jest.runAllTimers();
    });

    expect(value).toStrictEqual("abc def");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("abc");
  });

  test("undo deleted text", () => {
    let value = "";
    const setValue = (newValue: string) => {
      value = newValue;
    };

    const { result: undoRef, rerender } = renderHook(() =>
      useUndo(value, setValue)
    );

    act(() => {
      setValue("abc def");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("abc def");

    act(() => {
      // Delete the input value like a user would
      setValue("abc de");
      setValue("abc d");
      setValue("abc ");
      setValue("abc");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("abc");

    act(() => {
      setValue("ab");
      setValue("a");
      setValue("");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("abc");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("abc def");
  });

  test("handles newlines", () => {
    let value = "";
    const setValue = (newValue: string) => {
      value = newValue;
    };

    const { result: undoRef, rerender } = renderHook(
      () => useUndo(value, setValue),
      {
        initialProps: { value, setValue },
      }
    );

    act(() => {
      setValue("abc def");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("abc def");

    act(() => {
      setValue(`abc def

aaa
bbb`);
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("abc def\n\naaa\nbbb");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("abc def");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("");
  });

  test("typing between undos", () => {
    let value = "";
    const setValue = (newValue: string) => {
      value = newValue;
    };

    const { result: undoRef, rerender } = renderHook(() =>
      useUndo(value, setValue)
    );

    act(() => {
      setValue("abc");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("abc");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("");

    act(() => {
      setValue("def");
      rerender();
      jest.runAllTimers();
    });
    expect(value).toStrictEqual("def");

    act(() => {
      undoRef.current();
    });
    expect(value).toStrictEqual("");
  });
});
