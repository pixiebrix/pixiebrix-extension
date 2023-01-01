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

import React from "react";
import cx from "classnames";

const Centered: React.FunctionComponent<{
  isScrollable?: boolean;
  vertically?: boolean;
}> = ({ isScrollable = false, vertically = false, children }) => (
  <div
    className={cx("d-flex flex-column mx-auto mt-4 pb-2 max-550 text-center", {
      "h-100 overflow-auto": isScrollable,
      "h-100 justify-content-center": vertically,
    })}
  >
    {children}
  </div>
);

export default Centered;
