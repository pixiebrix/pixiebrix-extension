import { BlockType } from "@/blocks/util";
import { IBlock, RegistryId } from "@/core";

export type BlocksMap = Record<
  RegistryId,
  {
    block: IBlock;
    type: BlockType;
  }
>;

/*
 * FormikError.
 * It can be a string, a record of strings, or a record of records... i.e. it is dynamic and depends on the level of the state tree where the error happens.
 * It is never an array although we can get a nested error using index (number),
 * when the values state is represented by an array (ex. with the BlockPipeline, we'll do `PipelineErrors[0]`).
 * Keep in mind that despite it looks like an array (the top-level may look like an array - have numbers for property names), it is an object.
 * For instance, it doesn't have a `length` property.
 */
export type FormikError = string | FormikErrorTree;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record creates a circular ref
export type FormikErrorTree = {
  [key: number | string]: FormikError;
};
