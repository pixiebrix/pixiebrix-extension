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

import React, { useContext } from "react";
import DocumentContext from "./DocumentContext";
import { UnknownObject } from "@/types";
import { Args, mapArgs } from "@/runtime/mapArgs";
import { useAsyncState } from "@/hooks/common";
import { GridLoader } from "react-spinners";
import { BuildDocumentBranch, DocumentElement } from "./documentBuilderTypes";
import { produce } from "immer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getErrorMessage } from "@/errors";

type DocumentListProps = {
  array: UnknownObject[];
  elementKey?: string;
  config: Args;
  buildDocumentBranch: BuildDocumentBranch;
};

const DocumentListInternal: React.FC<DocumentListProps> = ({
  array,
  elementKey,
  config,
  buildDocumentBranch,
}) => {
  // Should be 'element' for any falsy value including empty string.
  elementKey = elementKey || "element";

  const documentContext = useContext(DocumentContext);

  const [rootDefinitions, isLoading, error] = useAsyncState(
    async () =>
      Promise.all(
        array.map(async (itemData) => {
          const elementContext = produce(documentContext, (draft) => {
            draft.options.ctxt[`@${elementKey}`] = itemData;
          });

          return (mapArgs(config, elementContext.options.ctxt, {
            implicitRender: null,
            autoescape: true,
          }) as Promise<DocumentElement>).then((documentElement) => ({
            documentElement,
            elementContext,
          }));
        })
      ),
    [array, elementKey, config, documentContext]
  );

  if (isLoading) {
    return <GridLoader />;
  }

  if (error) {
    return (
      <details>
        <summary className="text-danger">{getErrorMessage(error)}</summary>

        <pre className="mt-2">
          {((error as Error).stack ?? "").replaceAll(
            `chrome-extension://${process.env.CHROME_EXTENSION_ID}/`,
            ""
          )}
        </pre>
      </details>
    );
  }

  return (
    <>
      {rootDefinitions.map(({ documentElement, elementContext }, i) => {
        const { Component, props } = buildDocumentBranch(documentElement);
        return (
          <DocumentContext.Provider key={i} value={elementContext}>
            <Component {...props} />
          </DocumentContext.Provider>
        );
      })}
    </>
  );
};

const DocumentList: React.FC<DocumentListProps> = (props) => (
  <ErrorBoundary>
    <DocumentListInternal {...props} />
  </ErrorBoundary>
);

export default DocumentList;
