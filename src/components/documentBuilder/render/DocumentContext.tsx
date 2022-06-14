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

import React from "react";
import { BlockArgContext, BlockOptions, UUID } from "@/core";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { BusinessError } from "@/errors/businessErrors";

type DocumentState = {
  meta: {
    runId: UUID;
    extensionId: UUID;
  };
  options: BlockOptions<BlockArgContext>;
};

const blankContext = {
  "@input": {},
  "@options": {},
} as BlockArgContext;

const initialValue: DocumentState = {
  meta: {
    runId: null,
    extensionId: null,
  },
  options: {
    ctxt: blankContext,
    // The root should correspond to the host page's content script. If we passed document here, it would end up being
    // the document what's rendering the document (e.g., the sidebar panel's iframe document)
    root: null,
    logger: new ConsoleLogger(),
    headless: true,
    async runPipeline() {
      throw new BusinessError(
        "Support for running pipelines in documents not implemented"
      );
    },
  },
};

const DocumentContext = React.createContext<DocumentState>(initialValue);

export default DocumentContext;
