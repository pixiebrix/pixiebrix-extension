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

import React, { useState } from "react";
import { castArray } from "lodash";

/**
 * Loads one or more stylesheets and hides the content until they're done loading
 */
export const Stylesheet: React.FC<{ href: string | string[] }> = ({
  href,
  children,
}) => {
  const urls = castArray(href);
  const [remaining, setRemaining] = useState(urls.length);
  function onLoad() {
    setRemaining(remaining - 1);
  }

  return (
    <>
      {urls.map((href, index) => (
        <link
          rel="stylesheet"
          href={href}
          key={index}
          onLoad={onLoad}
          // The content must be shown even if this fails
          onError={onLoad}
        />
      ))}
      {/* Include the DOM to start loading the subresources too */}
      <div hidden={remaining > 0}>{children}</div>
    </>
  );
};
