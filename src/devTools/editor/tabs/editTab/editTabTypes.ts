import { BlockType } from "@/blocks/util";
import { IBlock, RegistryId } from "@/core";

export type BlocksMap = Record<
  RegistryId,
  {
    block: IBlock;
    type: BlockType;
  }
>;
