import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { BlockArgContext, BlockOptions } from "@/core";

export type DocumentViewProps = {
  body: DocumentElement[];
  options: BlockOptions<BlockArgContext>;
};
