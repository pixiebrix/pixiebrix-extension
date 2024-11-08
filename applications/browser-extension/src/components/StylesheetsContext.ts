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
import bootstrap from "@/vendors/bootstrapWithoutRem.css?loadAsUrl";
import bootstrapOverrides from "@/sidebar/sidebarBootstrapOverrides.scss?loadAsUrl";
import custom from "@/bricks/renderers/customForm.css?loadAsUrl";

export type StylesheetsContextType = {
  stylesheets: string[] | null;
};

const StylesheetsContext = React.createContext<StylesheetsContextType>({
  stylesheets: null,
});

function useStylesheetsContextWithDefaultValues({
  newStylesheets,
  defaultStylesheets,
  disableParentStyles,
}: {
  newStylesheets: string[] | undefined;
  defaultStylesheets: string[];
  disableParentStyles: boolean;
}): {
  stylesheets: string[];
} {
  const { stylesheets: inheritedStylesheets } = useContext(StylesheetsContext);

  const stylesheets: string[] = [];

  if (!disableParentStyles) {
    if (inheritedStylesheets == null) {
      stylesheets.push(...defaultStylesheets);
    } else {
      stylesheets.push(...inheritedStylesheets);
    }
  }

  if (newStylesheets != null) {
    stylesheets.push(...newStylesheets);
  }

  return { stylesheets };
}

export function useStylesheetsContextWithDocumentDefault({
  newStylesheets,
  disableParentStyles,
}: {
  newStylesheets: string[] | undefined;
  disableParentStyles: boolean;
}): {
  stylesheets: string[];
} {
  return useStylesheetsContextWithDefaultValues({
    newStylesheets,
    defaultStylesheets: [
      bootstrap,
      bootstrapOverrides,
      // DocumentView.css is an artifact produced by webpack, see the DocumentView entrypoint included in
      // `webpack.config.mjs`. We build styles needed to render documents separately from the rest of the sidebar
      // in order to isolate the rendered document from the custom Bootstrap theme included in the Sidebar app
      "/DocumentView.css",
      // Required because it can be nested in the DocumentView.
      "/CustomFormComponent.css",
    ],
    disableParentStyles,
  });
}

export function useStylesheetsContextWithFormDefault({
  newStylesheets,
  disableParentStyles,
}: {
  newStylesheets: string[] | undefined;
  disableParentStyles: boolean;
}): {
  stylesheets: string[];
} {
  return useStylesheetsContextWithDefaultValues({
    newStylesheets,
    defaultStylesheets: [
      bootstrap,
      bootstrapOverrides,
      // CustomFormComponent.css and EphemeralFormContent.css are artifacts produced by webpack, see the entrypoints.
      "/EphemeralFormContent.css",
      "/CustomFormComponent.css",
      custom,
    ],
    disableParentStyles,
  });
}

export default StylesheetsContext;
