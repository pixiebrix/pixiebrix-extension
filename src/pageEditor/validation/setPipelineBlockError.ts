import { set } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { joinElementName } from "@/components/documentBuilder/utils";

export function setPipelineBlockError(
  pipelineErrors: FormikErrorTree,
  errorMessage: string,
  ...path: string[]
) {
  const propertyNameInPipeline = joinElementName(...path);
  set(pipelineErrors, propertyNameInPipeline, errorMessage);
}
