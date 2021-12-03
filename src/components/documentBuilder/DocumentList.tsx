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
import { getComponentDefinition } from "./documentTree";
import { DocumentElement } from "./documentBuilderTypes";

type DocumentListProps = {
  array: UnknownObject[];
  elementKey?: string;
  config: Args;
};

const DocumentList: React.FC<DocumentListProps> = ({
  array,
  elementKey = "element",
  config,
}) => {
  const ctxt = useContext(DocumentContext);
  console.log("DocumentList", {
    array,
    elementKey,
    config,
  });
  const [componentDefinitions, isLoading] = useAsyncState(
    async () =>
      Promise.all(
        array.map(async (data) => {
          const elementContext = {
            ...ctxt,
            [`@${elementKey}`]: data,
          };
          return (mapArgs(config, elementContext, {
            implicitRender: null,
          }) as Promise<DocumentElement>).then((documentElement) =>
            getComponentDefinition(documentElement)
          );
        })
      ),
    [array, elementKey, config, ctxt]
  );

  return isLoading ? (
    <GridLoader />
  ) : (
    <>
      {componentDefinitions.map(({ Component, props }, index) => (
        <Component key={index} {...props} />
      ))}
    </>
  );
};

export default DocumentList;
