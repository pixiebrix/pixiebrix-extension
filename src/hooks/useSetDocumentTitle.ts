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

import { useEffect, useMemo } from "react";

export const SUFFIX = " | PixieBrix";

/**
 * Set title of the document, restoring the original title when component is unmounted.
 */
export function useSetDocumentTitle(title: string, show?: boolean): void {
  const originalTitle = useMemo(() => document.title, []);

  useEffect(() => {
    // Keep previous behavior when show is undefined, for backwards compatibility with other call-sites
    if (show === undefined || show) {
      document.title = `${title}${SUFFIX}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [originalTitle, show, title]);
}
