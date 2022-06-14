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

import { buildDocumentBranch } from "@/components/documentBuilder/documentTree";
import React, { useState } from "react";
import ReactShadowRoot from "react-shadow-root";
import BootstrapStylesheet from "@/blocks/renderers/BootstrapStylesheet";
import { DocumentViewProps } from "./DocumentViewProps";
import DocumentContext from "@/components/documentBuilder/render/DocumentContext";
import { joinElementName } from "@/components/documentBuilder/utils";

const DocumentView: React.FC<DocumentViewProps> = ({ body, options, meta }) => {
  // Track style loading to avoid a FOUC
  const [styleLoaded, setStyleLoaded] = useState(false);

  if (!meta?.runId) {
    // The sidebar panel should dynamically pass the prop through
    throw new Error("meta.runId is required for DocumentView");
  }

  if (!meta?.extensionId) {
    // The sidebar panel should dynamically pass the prop through
    throw new Error("meta.extensionId is required for DocumentView");
  }

  return (
    // Wrap in a React context provider that passes BlockOptions down to any embedded bricks
    // ReactShadowRoot needs to be inside an HTMLElement to attach to something
    <DocumentContext.Provider value={{ options, meta }}>
      <div className="h-100">
        <ReactShadowRoot>
          <BootstrapStylesheet
            onLoad={() => {
              setStyleLoaded(true);
            }}
          />
          {styleLoaded &&
            body.map((documentElement, index) => {
              const { Component, props } = buildDocumentBranch(
                documentElement,
                { staticId: joinElementName("body", "children"), branches: [] }
              );
              return <Component key={index} {...props} />;
            })}
        </ReactShadowRoot>
      </div>
    </DocumentContext.Provider>
  );
};

export default DocumentView;
