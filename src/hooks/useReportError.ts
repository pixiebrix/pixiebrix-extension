/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import reportError from "@/telemetry/reportError";
import { useEffect, useRef } from "react";

/**
 * React hook to report an error if it's different from the previous error.
 */
function useReportError(error: unknown): void {
  const previousError = useRef(error);

  useEffect(() => {
    if (error && error !== previousError.current) {
      reportError(error);

      previousError.current = error;
    }
  }, [error]);
}

export default useReportError;
