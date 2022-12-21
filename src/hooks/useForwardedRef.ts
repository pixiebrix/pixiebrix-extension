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

import {
  useRef,
  useImperativeHandle,
  type ForwardedRef,
  type MutableRefObject,
} from "react";

/**
 * Extracts an immediately-usable ref from a forwarded ref
 *
 * @example
 *   React.forwardRef((props, forwardedRef) => {
 *     const ref = useForwardedRef(forwardedRef);
 *     useEffect(() => {
 *       // You can't use `forwardedRef` here directly
 *       ref.current.focus();
 *     }, [])
 *     return <div ref={ref}>
 *   })
 */
export default function useForwardedRef<Ref>(
  forwardedRef: ForwardedRef<Ref>
): MutableRefObject<Ref> {
  const ref = useRef<Ref>();
  useImperativeHandle(forwardedRef, () => ref.current);
  return ref;
}
