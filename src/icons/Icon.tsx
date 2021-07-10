/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useEffect } from "react";
import { IconLibrary } from "@/core";
import iconAsSVG from "@/icons/svgIcons";
import { useState } from "react";

const Icon: React.FunctionComponent<{ icon: string; library: IconLibrary }> = ({
  icon,
  library,
}) => {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    void iconAsSVG({ id: icon, library, size: 16 }).then(setSvg);
  }, [icon, library]);

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: svg,
      }}
    />
  );
};

export default Icon;
