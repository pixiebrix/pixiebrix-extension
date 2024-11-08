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

import React from "react";
import styles from "./Icon.module.scss";
import useAsyncState from "@/hooks/useAsyncState";
import getSvgIcon from "@/icons/getSvgIcon";
import cx from "classnames";
import { type IconLibrary } from "@/types/iconTypes";

const Icon: React.FunctionComponent<{
  icon?: string;
  library?: IconLibrary;
  size?: number | string;
  className?: string;
  color?: string;
  title?: string;
  role?: React.AriaRole;
}> = ({ icon, library, size = 16, className, color, title, role }) => {
  const { data: svg = "" } = useAsyncState(
    async () => getSvgIcon({ id: icon, library, size, color }),
    [icon, library],
  );

  return (
    <span
      // XXX: should be setting role attribute on svg and embedding <title> instead?
      // See https://docs.fontawesome.com/web/dig-deeper/accessibility
      role={role ?? "img"}
      aria-label={title}
      className={cx(className, styles.root)}
      dangerouslySetInnerHTML={{
        __html: svg,
      }}
    />
  );
};

export default Icon;
