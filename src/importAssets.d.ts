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

// https://stackoverflow.com/questions/43638454/webpack-typescript-image-import
declare module "*.svg" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsUrl" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsText" {
  const CONTENT: string;
  export default CONTENT;
}

// Loading svg as React component using @svgr
declare module "*.svg?loadAsComponent" {
  import React from "react";

  const SVG: React.VFC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module "*.txt" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*.yaml" {
  const CONTENT: Record<string, unknown>;
  export default CONTENT;
}
