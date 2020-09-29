import { createSendScriptMessage } from "@/messaging/chrome";
import { READ_REACT_COMPONENT } from "@/messaging/constants";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

export interface ReactConfig {
  type: "react";
  selector: string;
  traverseUp?: number;
  rootProp?: string;
  waitMillis?: number;
}

export const withReactComponent = createSendScriptMessage(READ_REACT_COMPONENT);

async function doRead(reader: ReactConfig): Promise<ReaderOutput> {
  const { selector, traverseUp = 0, waitMillis = 1000, rootProp } = reader;
  return await withReactComponent({
    selector,
    traverseUp,
    waitMillis,
    rootProp,
  });
}

registerFactory("react", doRead);
