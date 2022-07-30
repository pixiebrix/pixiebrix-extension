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

import { useEffect, useRef } from "react";

type GenericHandler<T = unknown> = (arg: T) => void;

interface TabEvent<TValue> {
  addListener(tabId: number, handler: GenericHandler<TValue>): void;
  removeListener(tabId: number, handler: GenericHandler<TValue>): void;
}

export class SimpleEvent<TValue> implements TabEvent<TValue> {
  private readonly listeners = new Map<number, Array<GenericHandler<TValue>>>();

  addListener(tabId: number, handler: GenericHandler<TValue>): void {
    if (!this.listeners.has(tabId)) {
      this.listeners.set(tabId, []);
    }

    this.listeners.get(tabId).push(handler);
  }

  removeListener(tabId: number, handler: GenericHandler<TValue>): void {
    if (this.listeners.has(tabId)) {
      const current = this.listeners.get(tabId);
      this.listeners.set(
        tabId,
        current.filter((x) => x !== handler)
      );
    }
  }

  emit(tabId: number, value?: TValue): void {
    for (const listener of this.listeners.get(tabId) ?? []) {
      listener(value);
    }
  }
}

/**
 * React Hook that calls handler whenever event is emitted for the given tab
 * @param tabId the tab to listen to
 * @param event the tab event
 * @param handler the handler to call
 */
export function useTabEventListener<TValue>(
  tabId: number,
  event: TabEvent<TValue>,
  handler: GenericHandler<TValue>
): void {
  const savedHandler = useRef<GenericHandler<TValue>>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Create event listener that calls handler function stored in ref
    const listener = (x: TValue) => {
      savedHandler.current(x);
    };

    event.addListener(tabId, listener);

    // Remove event listener on cleanup
    return () => {
      event.removeListener(tabId, listener);
    };
  }, [event, tabId]);
}

/** Thinnest possible wrapper around native events */
type SimpleEventListener<Detail> = (detail: Detail) => void;
export class SimpleEventTarget<Detail> extends EventTarget {
  private readonly coreEvent = "DEFAULT";
  private readonly weakEvents = new WeakMap();

  // Permanently map simplified callbacks to native listeners.
  // This acts as a memoization/deduplication which matches the native behavior.
  // Calling `add(cb); add(cb); remove(cb)` should only add it once and remove it once.
  private getNativeListener(
    callback: SimpleEventListener<Detail>
  ): EventListener {
    if (this.weakEvents.has(callback)) {
      return this.weakEvents.get(callback);
    }

    const native = (event: CustomEvent) => {
      callback(event.detail);
    };

    this.weakEvents.set(callback, native);
    return native;
  }

  add(callback: SimpleEventListener<Detail>): void {
    this.addEventListener(this.coreEvent, this.getNativeListener(callback));
  }

  remove(callback: SimpleEventListener<Detail>): void {
    this.removeEventListener(this.coreEvent, this.getNativeListener(callback));
  }

  emit(detail?: Detail): void {
    this.dispatchEvent(new CustomEvent(this.coreEvent, { detail }));
  }
}
