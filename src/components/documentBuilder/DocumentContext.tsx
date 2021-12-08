import React from "react";
import { BlockArgContext, BlockOptions } from "@/core";
import ConsoleLogger from "@/tests/ConsoleLogger";

type DocumentState = {
  options: BlockOptions<BlockArgContext>;
};

const initialValue: DocumentState = {
  options: {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- have to cast to BlockArgContext explicitly
    ctxt: {
      "@input": {},
      "@options": {},
    } as BlockArgContext,
    // The root should correspond to the host page's content script. If we passed document here, it would end up being
    // the document what's rendering the document (e.g., the sidebar panel's iframe document)
    root: null,
    logger: new ConsoleLogger(),
    headless: true,
  },
};

const DocumentContext = React.createContext<DocumentState>(initialValue);

export default DocumentContext;
