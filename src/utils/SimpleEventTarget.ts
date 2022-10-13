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

type SimpleEventListener<Detail> = (detail: Detail) => void;

/**
 * Thinnest possible wrapper around native events
 *
 * @usage
 *   const smokeSignals = new SimpleEventTarget();
 *   smokeSignals.add(details => console.log(details))
 *   smokeSignals.emit('The BBQ is ready');
 */
export class SimpleEventTarget<Detail> extends EventTarget {
  coreEvent = "DEFAULT";
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
