import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { propertiesToSchema } from "@/validators/generic";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type JsonObject } from "type-fest";
import { setPageState } from "@/contentScript/pageState";
import { EffectABC } from "@/types/bricks/effectTypes";

/**
 * A simple brick to assign a value to a Mod Variable.
 * @since 1.7.34
 */
class AssignModVariable extends EffectABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/state/assign");

  constructor() {
    super(
      AssignModVariable.BRICK_ID,
      "Assign Mod Variable",
      "Assign / Set the value of a Mod Variable"
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      variableName: {
        title: "Variable Name",
        type: "string",
        description: "The variable name, excluding the `@` prefix.",
      },
      value: {
        title: "Value",
        description: "The value to assign to the variable.",
        additionalProperties: true,
      },
    },
    ["variableName", "value"]
  );

  uiSchema = {
    "ui:order": ["variableName", "value"],
  };

  async effect(
    {
      variableName,
      value,
    }: BrickArgs<{
      variableName: string;
      value: unknown;
    }>,
    { logger }: BrickOptions
  ): Promise<void> {
    const { blueprintId = null, extensionId } = logger.context;

    setPageState({
      namespace: "blueprint",
      // Input is validated, so we know value is a JsonPrimitive or JsonObject
      data: { [variableName]: value } as JsonObject,
      mergeStrategy: "shallow",
      extensionId,
      blueprintId,
    });
  }
}

export default AssignModVariable;
