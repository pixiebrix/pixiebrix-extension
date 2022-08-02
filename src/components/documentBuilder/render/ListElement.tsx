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

import React, { useContext } from "react";
import DocumentContext from "./DocumentContext";
import { UnknownObject } from "@/types";
import { Args, isDeferExpression } from "@/runtime/mapArgs";
import { useAsyncState } from "@/hooks/common";
import Loader from "@/components/Loader";
import {
  BuildDocumentBranch,
  DocumentElement,
  DynamicPath,
} from "@/components/documentBuilder/documentBuilderTypes";
import { produce } from "immer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getErrorMessage } from "@/errors/errorHelpers";
import { runMapArgs } from "@/contentScript/messenger/api";
import { isNullOrBlank, joinPathParts } from "@/utils";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { whoAmI } from "@/background/messenger/api";

type DocumentListProps = {
  array: UnknownObject[];
  elementKey?: string;
  config: Args;
  buildDocumentBranch: BuildDocumentBranch;
  tracePath: DynamicPath;
};

const defaultArray = Object.freeze([]);

const ListElementInternal: React.FC<DocumentListProps> = ({
  array = defaultArray,
  elementKey,
  config,
  buildDocumentBranch,
  tracePath,
}) => {
  const { staticId, branches } = tracePath;

  // Should be "element" for any falsy value including empty string.
  elementKey = isNullOrBlank(elementKey) ? "element" : elementKey;

  const documentContext = useContext(DocumentContext);

  const [rootDefinitions, isLoading, error] = useAsyncState(async () => {
    const me = await whoAmI();
    const target = { tabId: me.tab.id, frameId: 0 };

    const key = `@${elementKey}`;

    if (
      Object.prototype.hasOwnProperty.call(documentContext.options.ctxt, key)
    ) {
      documentContext.options.logger.warn(
        `List key ${key} shadows an existing key`
      );
    }

    return Promise.all(
      array.map(async (itemData) => {
        const elementContext = produce(documentContext, (draft) => {
          // eslint-disable-next-line security/detect-object-injection -- we appended a @ to the front of key and are using immer
          draft.options.ctxt[key] = itemData;
        });

        let documentElement: unknown;

        if (isDeferExpression(config)) {
          documentElement = (await runMapArgs(
            target,
            // TODO: pass runtime version via DocumentContext instead of hard-coding it. This is be wrong for v4+
            {
              config: config.__value__,
              context: elementContext.options.ctxt,
              options: apiVersionOptions("v3"),
            }
          )) as DocumentElement;
        } else {
          // Must be a constant at this point. Non-deferred templates would have already been rendered.
          documentElement = config;
        }

        return {
          documentElement,
          elementContext,
        };
      })
    );
  }, [array, elementKey, config, documentContext]);

  if (isLoading) {
    return <Loader />;
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
      {rootDefinitions.map(({ documentElement, elementContext }, index) => {
        const { Component, props } = buildDocumentBranch(
          documentElement as DocumentElement,
          {
            staticId: joinPathParts(staticId, "list", "children"),
            branches: [...branches, { staticId, index }],
          }
        );
        return (
          <DocumentContext.Provider key={index} value={elementContext}>
            <Component {...props} />
          </DocumentContext.Provider>
        );
      })}
    </>
  );
};

const ListElement: React.FC<DocumentListProps> = (props) => (
  <ErrorBoundary errorContext="List element.">
    <ListElementInternal {...props} />
  </ErrorBoundary>
);

export default ListElement;
