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

import { useEffect } from "react";

/** Like setTimeout, except that if the delay is 0 or lower, the function is called synchronously */
const semiSyncTimeout = (
  callback: (...args: unknown[]) => void,
  millis: number,
  ...args: unknown[]
) => {
  if (millis <= 0) {
    callback(...args);
    return;
  }

  const timer = setTimeout(callback, millis, ...args);
  return () => {
    clearTimeout(timer);
  };
};

export default function useAutoFocus(
  elementRef: React.MutableRefObject<HTMLElement>,
  focus = true,
  delayMillis = 0
) {
  useEffect(() => {
    if (!focus) {
      return;
    }

    const act = () => {
      elementRef.current?.focus();
    };

    return semiSyncTimeout(act, delayMillis);
  }, [elementRef, focus, delayMillis]);
}
