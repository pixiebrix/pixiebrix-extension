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

import React, { useContext } from "react";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import bootstrapOverrides from "@/pageEditor/sidebar/sidebarBootstrapOverrides.scss?loadAsUrl";
import custom from "@/bricks/renderers/customForm.css?loadAsUrl";

export type StylesheetsContextType = {
  stylesheets: string[] | null;
};

const StylesheetsContext = React.createContext<StylesheetsContextType>({
  stylesheets: null,
});

export function useStylesheetsContextWithDocumentDefault(): {
  stylesheets: string[];
} {
  const { stylesheets } = useContext(StylesheetsContext);
  return {
    stylesheets: stylesheets || [
      // DocumentView.css is an artifact produced by webpack, see the DocumentView entrypoint included in
      // `webpack.config.mjs`. We build styles needed to render documents separately from the rest of the sidebar
      // in order to isolate the rendered document from the custom Bootstrap theme included in the Sidebar app
      "/DocumentView.css",
      bootstrap,
      bootstrapOverrides,
    ],
  };
}

export function useStylesheetsContextWithFormDefault(): {
  stylesheets: string[];
} {
  const { stylesheets } = useContext(StylesheetsContext);
  return {
    stylesheets: stylesheets || [bootstrap, bootstrapOverrides, custom],
  };
}

export default StylesheetsContext;
