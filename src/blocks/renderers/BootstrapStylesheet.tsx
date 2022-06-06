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

import React, { useEffect, useRef } from "react";
import theme from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import { noop } from "lodash";

type BootstrapStylesheetProps = {
  // Allow parent to avoid a FOUC: https://webkit.org/blog/66/the-fouc-problem/ by waiting for the stylesheet to have
  // had a chance to load.
  // The load event fires once the stylesheet and all of its imported content has been loaded and parsed, and
  // immediately before the styles start being applied to the content.
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#stylesheet_load_events
  onLoad?: () => void;
};

const BootstrapStylesheet: React.FC<BootstrapStylesheetProps> = ({
  onLoad = noop,
}) => {
  const linkRef = useRef<HTMLLinkElement>();

  useEffect(() => {
    linkRef.current.addEventListener("load", () => {
      requestAnimationFrame(() => {
        onLoad();
      });
    });
  }, [onLoad]);

  return <link rel="stylesheet" href={theme} ref={linkRef} />;
};

export default BootstrapStylesheet;
