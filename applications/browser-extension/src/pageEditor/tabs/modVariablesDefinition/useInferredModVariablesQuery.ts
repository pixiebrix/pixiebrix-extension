import type { RegistryId } from "@/types/registryTypes";
import { useSelector } from "react-redux";
import { selectGetDraftFormStatesPromiseForModId } from "@/pageEditor/starterBricks/adapter";
import useAsyncState from "@/hooks/useAsyncState";
import type { ModVariable } from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorTypes";
import ModVariableSchemasVisitor from "@/analysis/analysisVisitors/pageStateAnalysis/modVariableSchemasVisitor";
import { reduce } from "lodash";
import {
  minimalSchemaFactory,
  unionSchemaDefinitionTypes,
} from "@/utils/schemaUtils";
import { mapDefinitionToFormValues } from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorHelpers";
import type { AsyncState } from "@/types/sliceTypes";

/**
 * Returns the inferred mod variables for the given mod id.
 * @param modId the mod id being edited in editor
 * @see ModVariableSchemasVisitor
 */
function useInferredModVariablesQuery(
  modId: RegistryId,
): AsyncState<ModVariable[]> {
  const getDraftFormStatesPromiseForModId = useSelector(
    selectGetDraftFormStatesPromiseForModId,
  );

  return useAsyncState<ModVariable[]>(async () => {
    const formStates = await getDraftFormStatesPromiseForModId(modId);
    const { knownProperties } =
      await ModVariableSchemasVisitor.collectSchemas(formStates);

    const schema = reduce(
      knownProperties.filter((x) => x != null),
      (acc, properties) =>
        unionSchemaDefinitionTypes(acc, {
          type: "object",
          properties,
        }),
      minimalSchemaFactory(),
    );

    if (typeof schema === "boolean") {
      // Should never happen in practice because collectSchemas should not receive any boolean schemas
      return [];
    }

    return mapDefinitionToFormValues({ schema }).variables;
  }, [modId, getDraftFormStatesPromiseForModId]);
}

export default useInferredModVariablesQuery;
