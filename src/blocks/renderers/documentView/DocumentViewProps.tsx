import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { BlockOptions } from "@/core";

export type DocumentViewProps = {
  body: DocumentElement[];
  options: BlockOptions;
};
