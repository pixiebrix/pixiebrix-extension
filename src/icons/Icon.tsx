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

import styles from "./Icon.module.scss";
import React, { useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { IconLibrary } from "@/core";
import getSvgIcon from "@/icons/getSvgIcon";
import cx from "classnames";

const Icon: React.FunctionComponent<{
  icon?: string;
  library?: IconLibrary;
  size?: number;
  className?: string;
}> = ({ icon, library, size = 16, className }) => {
  const [svg, setSvg] = useState("");

  useAsyncEffect(
    async (isMounted) => {
      const svg = await getSvgIcon({ id: icon, library, size });
      if (!isMounted()) {
        return;
      }

      setSvg(svg);
    },
    [icon, library, setSvg]
  );

  return (
    <span
      className={cx(className, styles.root)}
      dangerouslySetInnerHTML={{
        __html: svg,
      }}
    />
  );
};

export default Icon;
