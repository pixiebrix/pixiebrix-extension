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

import useAbortSignal from "@/hooks/useAbortSignal";
import React from "react";

/**
 * Render children until the signal is aborted
 */
const AbortSignalGate: React.FunctionComponent<{ signal: AbortSignal }> = ({
  signal,
  children,
}) => {
  const aborted = useAbortSignal(signal);
  return aborted ? null : <>{children}</>;
};

export default AbortSignalGate;
