import { set } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { joinPathParts } from "@/utils";

export function setPipelineBlockError(
  pipelineErrors: FormikErrorTree,
  errorMessage: string,
  ...path: string[]
) {
  const propertyNameInPipeline = joinPathParts(...path);
  set(pipelineErrors, propertyNameInPipeline, errorMessage);
}
