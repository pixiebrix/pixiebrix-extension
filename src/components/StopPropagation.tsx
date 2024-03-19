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

import React, { type ReactNode } from "react";

// Extract form DOMAttributes via keyof
type ValidEventNames = Exclude<
  keyof React.DOMAttributes<HTMLElement>,
  "children"
>;

type StopPropagationProps = Partial<Record<ValidEventNames, boolean>> & {
  children: ReactNode;
};

const stopPropagation = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

/**
 * Ensure that events inside this component do not bubble up
 *
 * @example <StopPropagation onClick onKeyPress><button/></StopPropagation>
 */
const StopPropagation: React.FC<StopPropagationProps> = ({
  children,
  ...events
}) => {
  const wrappedEvents: Record<string, typeof stopPropagation> = {};

  for (const eventName of Object.keys(events)) {
    if (eventName.startsWith("on")) {
      wrappedEvents[eventName] = stopPropagation;
    } else {
      throw new TypeError(
        `Invalid property passed to StopPropagation: ${eventName}`,
      );
    }
  }

  return <div {...wrappedEvents}>{children}</div>;
};

export default StopPropagation;
