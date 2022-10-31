import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { BlockArgContext, BlockOptions } from "@/core";
import { UUID } from "@/idTypes";

export type DocumentViewProps = {
  body: DocumentElement[];
  options: BlockOptions<BlockArgContext>;
  meta: {
    runId: UUID;
    extensionId: UUID;
  };
};
