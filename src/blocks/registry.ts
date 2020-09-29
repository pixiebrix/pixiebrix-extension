import BaseRegistry from "@/baseRegistry";
import { fromJS } from "@/blocks/transformers/blockFactory";
import { IBlock } from "@/core";

const registry = new BaseRegistry<IBlock>("registry:blocks", "blocks", fromJS);

export function registerBlock(block: IBlock) {
  registry.register(block);
}

export default registry;
