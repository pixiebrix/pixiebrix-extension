import castArray from "lodash/castArray";
import { createSendScriptMessage } from "@/messaging/chrome";
import {
  READ_EMBER_COMPONENT,
  READ_EMBER_VIEW_ATTRS,
} from "@/messaging/constants";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

export interface EmberConfig {
  type: "emberjs";
  selector: string;
  attrs: string | string[];
}

export const withEmberComponentProps = createSendScriptMessage(
  READ_EMBER_COMPONENT
);

export const withEmberViewAttrs = createSendScriptMessage(
  READ_EMBER_VIEW_ATTRS
);

async function doRead(reader: EmberConfig): Promise<ReaderOutput> {
  const { attrs: rawAttrs, selector } = reader;
  const attrs = castArray(rawAttrs ?? []);
  const values = await withEmberViewAttrs({ selector, attrs });
  return attrs.length === 1 ? values[attrs[0]] : values;
}

registerFactory("emberjs", doRead);
