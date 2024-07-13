import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type JsonObject, type JsonPrimitive } from "type-fest";
import {
  MergeStrategies,
  setState,
  StateNamespaces,
} from "@/platform/state/stateController";
import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickConfig } from "@/bricks/types";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { mapMessageContextToModComponentRef } from "@/utils/modUtils";

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
      "Assign / Set the value of a Mod Variable",
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  override async getModVariableSchema(
    _config: BrickConfig,
  ): Promise<Schema | undefined> {
    const { variableName: variableExpression } = _config.config;

    let name: string | null = "";
    try {
      name = castTextLiteralOrThrow(variableExpression);
    } catch {
      return;
    }

    if (name) {
      return {
        type: "object",
        properties: {
          // For now, only provide existence information for the variable
          [name]: true,
        },
        additionalProperties: false,
        required: [name],
      };
    }

    return {
      type: "object",
      additionalProperties: true,
    };
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
    ["variableName", "value"],
  );

  override uiSchema = {
    "ui:order": ["variableName", "value"],
  };

  async effect(
    {
      variableName,
      value,
    }: BrickArgs<{
      variableName: string;
      // Input is validated, so we know value is a JsonPrimitive or JsonObject
      value: JsonPrimitive | JsonObject;
    }>,
    { logger }: BrickOptions,
  ): Promise<void> {
    setState({
      namespace: StateNamespaces.MOD,
      data: { [variableName]: value },
      mergeStrategy: MergeStrategies.SHALLOW,
      modComponentRef: mapMessageContextToModComponentRef(logger.context),
    });
  }
}

export default AssignModVariable;
