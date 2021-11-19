import React from "react";
import { BlockOptions } from "@/core";
import ConsoleLogger from "@/tests/ConsoleLogger";

type InnerContext = {
  options: BlockOptions;
};

const initialValue: InnerContext = {
  options: {
    ctxt: {
      "@input": {},
      "@options": {},
    },
    // The root should correspond to the host page's content script. If we passed document here, it would end up being
    // the document what's rendering the document (e.g., the sidebar panel's iframe document)
    root: null,
    logger: new ConsoleLogger(),
    headless: true,
  },
};

const InnerComponentContext = React.createContext<InnerContext>(initialValue);

export default InnerComponentContext;
