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

import "@/vendors/bootstrapWithoutRem.css";
import "@/sidebar/sidebarBootstrapOverrides.scss";
import { buildDocumentBuilderSubtree } from "@/pageEditor/documentBuilder/documentTree";
import React from "react";
import { type DocumentViewProps } from "./DocumentViewProps";
import DocumentContext from "@/pageEditor/documentBuilder/render/DocumentContext";
import { Stylesheets } from "@/components/Stylesheets";
import { joinPathParts } from "@/utils/formUtils";
import StylesheetsContext, {
  useStylesheetsContextWithDocumentDefault,
} from "@/components/StylesheetsContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import "@fortawesome/fontawesome-svg-core/styles.css";

const DocumentView: React.FC<DocumentViewProps> = ({
  body,
  stylesheets: newStylesheets,
  disableParentStyles = false,
  options,
  meta,
  onAction,
}) => {
  // The code for RendererComponent isn't fully type-safe. So dynamically check the necessary meta props are passed in.
  assertNotNullish(meta, "meta is required for DocumentView");
  assertNotNullish(meta.runId, "meta.runId is required for DocumentView");
  assertNotNullish(
    meta.modComponentRef,
    "meta.modComponentRef is required for DocumentView",
  );

  const { stylesheets } = useStylesheetsContextWithDocumentDefault({
    newStylesheets,
    disableParentStyles,
  });

  return (
    // Wrap in a React context provider that passes BrickOptions down to any embedded bricks
    <DocumentContext.Provider value={{ options, onAction }}>
      <StylesheetsContext.Provider value={{ stylesheets }}>
        <Stylesheets href={stylesheets}>
          {body.map((documentElement, index) => {
            const documentBuilderSubtree = buildDocumentBuilderSubtree(
              documentElement,
              {
                staticId: joinPathParts("body", "children"),
                // Root of the document, so no branches taken yet
                branches: [],
              },
            );

            if (documentBuilderSubtree == null) {
              return null;
            }

            const { Component, props } = documentBuilderSubtree;
            // eslint-disable-next-line react/no-array-index-key -- They have no other unique identifier
            return <Component key={index} {...props} />;
          })}
        </Stylesheets>
      </StylesheetsContext.Provider>
    </DocumentContext.Provider>
  );
};

export default DocumentView;
