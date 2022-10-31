import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { BlockArgContext, BlockOptions, UUID } from "@/core";

export type DocumentViewProps = {
  body: DocumentElement[];
  options: BlockOptions<BlockArgContext>;
  meta: {
    runId: UUID;
    extensionId: UUID;
  };
};
