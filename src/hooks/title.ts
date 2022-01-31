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
import { useEffect, useMemo } from "react";

const SUFFIX = " | PixieBrix";

/**
 * Set title of the document, restoring the original title when component is unmounted.
 */
export function useTitle(title: string): void {
  const originalTitle = useMemo(() => document.title, []);

  useEffect(() => {
    document.title = `${title}${SUFFIX}`;
    return () => {
      document.title = originalTitle;
    };
  }, [originalTitle, title]);
}
