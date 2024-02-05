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

import { buildDocumentBranch } from "@/components/documentBuilder/documentTree";
import React from "react";
import EmotionShadowRoot from "react-shadow/emotion";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import bootstrapOverrides from "@/pageEditor/sidebar/sidebarBootstrapOverrides.scss?loadAsUrl";

import { type DocumentViewProps } from "./DocumentViewProps";
import DocumentContext from "@/components/documentBuilder/render/DocumentContext";
import { Stylesheets } from "@/components/Stylesheets";
import { joinPathParts } from "@/utils/formUtils";
import { isEmpty } from "lodash";

const DocumentView: React.FC<DocumentViewProps> = ({
  body,
  stylesheets = [],
  options,
  meta,
  onAction,
}) => {
  if (!meta?.runId) {
    // The sidebar panel should dynamically pass the prop through
    throw new Error("meta.runId is required for DocumentView");
  }

  if (!meta?.extensionId) {
    // The sidebar panel should dynamically pass the prop through
    throw new Error("meta.extensionId is required for DocumentView");
  }

  const stylesheetUrls = [
    // DocumentView.css is an artifact produced by webpack, see the DocumentView entrypoint included in
    // `webpack.config.mjs`. We build styles needed to render documents separately from the rest of the sidebar
    // in order to isolate the rendered document from the custom Bootstrap theme included in the Sidebar app
    "/DocumentView.css",
  ];

  if (isEmpty(stylesheets)) {
    stylesheetUrls.push(bootstrap, bootstrapOverrides);
  } else {
    // Custom stylesheets overrides bootstrap themes
    stylesheetUrls.push(...stylesheets);
  }

  return (
    // Wrap in a React context provider that passes BrickOptions down to any embedded bricks
    <DocumentContext.Provider value={{ options, onAction }}>
      <EmotionShadowRoot.div className="h-100">
        <Stylesheets href={stylesheetUrls}>
          {body.map((documentElement, index) => {
            const documentBranch = buildDocumentBranch(documentElement, {
              staticId: joinPathParts("body", "children"),
              // Root of the document, so no branches taken yet
              branches: [],
            });

            if (documentBranch == null) {
              return null;
            }

            const { Component, props } = documentBranch;
            return <Component key={index} {...props} />;
          })}
        </Stylesheets>
      </EmotionShadowRoot.div>
    </DocumentContext.Provider>
  );
};

export default DocumentView;
