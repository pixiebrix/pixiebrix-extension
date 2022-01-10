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
import { castArray, uniq } from "lodash";

/**
 * Loads one or more stylesheets and hides the content until they're done loading.
 *
 * Does not support changing the initial href(s)
 */
export const Stylesheet: React.FC<{ href: string | string[] }> = ({
  href,
  children,
}) => {
  const urls = uniq(castArray(href));
  const [resolved, setResolved] = useState<string[]>([]);

  // `every` returns true for empty arrays
  const allResolved = urls.every((url) => resolved.includes(url));

  return (
    <>
      {urls.map((href) => {
        const resolve = () => {
          setResolved((prev) => [...prev, href]);
        };

        return (
          <link
            rel="stylesheet"
            href={href}
            key={href}
            onLoad={resolve}
            // The content must be shown even if this fails
            onError={resolve}
          />
        );
      })}
      {/* Include the DOM to start loading the subresources too */}
      <div hidden={!allResolved}>{children}</div>
    </>
  );
};
