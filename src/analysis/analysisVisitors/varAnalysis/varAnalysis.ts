/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import PipelineExpressionVisitor, {
  type VisitDocumentElementArgs,
} from "@/blocks/PipelineExpressionVisitor";
import {
  nestedPosition,
  type VisitBlockExtra,
  type VisitPipelineExtra,
} from "@/blocks/PipelineVisitor";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import type { Expression, Schema, TemplateEngine } from "@/core";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getVariableKeyForSubPipeline } from "@/pageEditor/utils";
import {
  isDeferExpression,
  isExpression,
  isNunjucksExpression,
  isVarExpression,
} from "@/runtime/mapArgs";
import { makeServiceContext } from "@/services/serviceUtils";
import { isEmpty } from "lodash";
import {
  type Analysis,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import VarMap, { VarExistence } from "./varMap";
import { type TraceRecord } from "@/telemetry/trace";
import parseTemplateVariables from "./parseTemplateVariables";
import recipesRegistry from "@/recipes/registry";
import blockRegistry, { type TypedBlockMap } from "@/blocks/registry";
import { AnnotationType } from "@/types";
import { joinPathParts } from "@/utils";
import { type ListDocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { fromJS } from "@/extensionPoints/factory";

export const INVALID_VARIABLE_GENERIC_MESSAGE = "Invalid variable name";

export const NO_VARIABLE_PROVIDED_MESSAGE = "Variable is blank";

export const VARIABLE_SHOULD_START_WITH_AT_MESSAGE =
  "Variable name should start with @";

type PreviousVisitedBlock = {
  vars: VarMap;
  output: VarMap | null;
};

export enum KnownSources {
  INPUT = "input",
  OPTIONS = "options",
  SERVICE = "service",
  TRACE = "trace",
}

async function setServiceVars(extension: FormState, contextVars: VarMap) {
  // Loop through all the services so we can set the source each service variable properly
  for (const service of extension.services ?? []) {
    // eslint-disable-next-line no-await-in-loop
    const serviceContext = await makeServiceContext([service]);
    contextVars.setExistenceFromValues({
      source: `${KnownSources.SERVICE}:${service.id}`,
      values: serviceContext,
    });
  }
}

/**
 * Set the input variables from the ExtensionPoint definition.
 */
async function setInputVars(
  extension: FormState,
  contextVars: VarMap
): Promise<void> {
  const adapter = ADAPTERS.get(extension.extensionPoint.definition.type);
  const config = adapter.selectExtensionPointConfig(extension);

  const extensionPoint = fromJS(config);

  const reader = await extensionPoint.defaultReader();

  setVarsFromSchema({
    schema: reader?.outputSchema ?? {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
    contextVars,
    source: KnownSources.INPUT,
    parentPath: ["@input"],
  });
}

type SetVarsFromSchemaArgs = {
  /**
   * The schema of the properties to use to set the variables.
   */
  schema: Schema;

  /**
   * The variable map to set the variables in.
   */
  contextVars: VarMap;

  /**
   * The source for the VarMap (e.g. "input:reader", "trace", or block path in the pipeline).
   */
  source: string;

  /**
   * The parent path of the properties in the schema.
   */
  parentPath: string[];

  /**
   * The existence to set the variables to. If not provided, the existence will be determined by the schema.
   */
  existenceOverride?: VarExistence;
};

function setVarsFromSchema({
  schema,
  contextVars,
  source,
  parentPath,
  existenceOverride,
}: SetVarsFromSchemaArgs) {
  const { properties, required } = schema;
  if (properties == null) {
    contextVars.setExistence({
      source,
      path: parentPath,
      existence: existenceOverride ?? VarExistence.DEFINITELY,
      allowAnyChild: true,
    });
    return;
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (typeof propertySchema === "boolean") {
      continue;
    }

    if (propertySchema.type === "object") {
      setVarsFromSchema({
        schema: propertySchema,
        contextVars,
        source,
        parentPath: [...parentPath, key],
      });
    } else if (propertySchema.type === "array") {
      const existence =
        existenceOverride ?? required?.includes(key)
          ? VarExistence.DEFINITELY
          : VarExistence.MAYBE;

      const nodePath = [...parentPath, key];

      // If the items is an array, then we allow any child to simplify the validation logic
      const allowAnyChild =
        Array.isArray(propertySchema.items) ||
        !isEmpty(propertySchema.additionalItems);

      // Setting existence for the current node
      contextVars.setExistence({
        source,
        path: nodePath,
        existence,
        isArray: true,
        allowAnyChild,
      });

      if (allowAnyChild) {
        continue;
      }

      if (
        typeof propertySchema.items == "object" &&
        !Array.isArray(propertySchema.items) &&
        propertySchema.items.type === "object"
      ) {
        setVarsFromSchema({
          schema: propertySchema.items,
          contextVars,
          source,
          parentPath: nodePath,
        });
      }
    } else {
      contextVars.setExistence({
        source,
        path: [...parentPath, key],
        existence:
          existenceOverride ?? required?.includes(key)
            ? VarExistence.DEFINITELY
            : VarExistence.MAYBE,
      });
    }
  }
}

async function setOptionsVars(
  extension: FormState,
  contextVars: VarMap
): Promise<void> {
  if (extension.recipe == null) {
    return;
  }

  const recipeId = extension.recipe.id;
  const recipe = await recipesRegistry.lookup(recipeId);
  const optionsSchema = recipe?.options?.schema;
  if (isEmpty(optionsSchema)) {
    return;
  }

  const source = `${KnownSources.OPTIONS}:${recipeId}`;
  const optionsOutputKey = "@options";

  setVarsFromSchema({
    schema: optionsSchema,
    contextVars,
    source,
    parentPath: [optionsOutputKey],
  });

  if (!isEmpty(extension.optionsArgs)) {
    for (const optionName of Object.keys(extension.optionsArgs)) {
      contextVars.setExistence({
        source,
        path: [optionsOutputKey, optionName],
        existence: VarExistence.DEFINITELY,
      });
    }
  }
}

class VarAnalysis extends PipelineExpressionVisitor implements Analysis {
  private readonly knownVars = new Map<string, VarMap>();
  private currentBlockKnownVars: VarMap;
  private previousVisitedBlock: PreviousVisitedBlock = null;
  private readonly contextStack: PreviousVisitedBlock[] = [];
  protected readonly annotations: AnalysisAnnotation[] = [];
  private allBlocks: TypedBlockMap;

  get id() {
    return "var";
  }

  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  getKnownVars() {
    return this.knownVars;
  }

  private safeGetOutputSchema(blockConfig: BlockConfig): Schema | undefined {
    const block = this.allBlocks.get(blockConfig.id)?.block;

    if (!block) {
      return;
    }

    // Be defensive if getOutputSchema errors due to nested variables, etc.
    try {
      return block.getOutputSchema(blockConfig);
    } catch {
      // NOP
    }

    return block.outputSchema ?? {};
  }

  /**
   * @param trace the trace for the latest run of the extension
   */
  constructor(private readonly trace: TraceRecord[]) {
    super();
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    this.currentBlockKnownVars = this.previousVisitedBlock.vars.clone();
    if (this.previousVisitedBlock.output != null) {
      this.currentBlockKnownVars.addSourceMap(this.previousVisitedBlock.output);
    }

    const traceRecord = this.trace.find(
      (x) =>
        x.blockInstanceId === blockConfig.instanceId &&
        x.templateContext != null
    );
    if (traceRecord != null) {
      this.currentBlockKnownVars.setExistenceFromValues({
        source: KnownSources.TRACE,
        values: traceRecord.templateContext,
      });
    }

    this.knownVars.set(position.path, this.currentBlockKnownVars);

    this.previousVisitedBlock = {
      vars: this.currentBlockKnownVars,
      output: null,
    };

    if (blockConfig.outputKey) {
      const outputVarName = `@${blockConfig.outputKey}`;
      const currentBlockOutput = new VarMap();

      const outputSchema = this.safeGetOutputSchema(blockConfig);

      if (outputSchema == null) {
        currentBlockOutput.setOutputKeyExistence({
          source: position.path,
          outputKey: outputVarName,
          existence:
            blockConfig.if == null
              ? VarExistence.DEFINITELY
              : VarExistence.MAYBE,
          allowAnyChild: true,
        });
      } else {
        setVarsFromSchema({
          schema: outputSchema,
          contextVars: currentBlockOutput,
          source: position.path,
          parentPath: [outputVarName],
          existenceOverride:
            blockConfig.if == null ? undefined : VarExistence.MAYBE,
        });
      }

      this.previousVisitedBlock.output = currentBlockOutput;
    }

    super.visitBlock(position, blockConfig, extra);
  }

  override visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>
  ): void {
    if (isVarExpression(expression)) {
      this.visitVarExpression(position, expression);
    } else if (isNunjucksExpression(expression)) {
      this.visitNunjucksExpression(position, expression);
    }
  }

  private visitVarExpression(
    position: BlockPosition,
    expression: Expression<string, "var">
  ) {
    const varName = expression.__value__;
    if (isEmpty(varName)) {
      return;
    }

    if (!this.currentBlockKnownVars?.isVariableDefined(varName)) {
      this.pushNotFoundVariableAnnotation(position, varName, expression);
    }
  }

  private visitNunjucksExpression(
    position: BlockPosition,
    expression: Expression<string, "nunjucks">
  ) {
    let templateVariables: string[];
    try {
      templateVariables = parseTemplateVariables(expression.__value__);
    } catch {
      // Parsing errors usually happen because of malformed or incomplete template
      // Ignoring this for VarAnalysis
      return;
    }

    for (const varName of templateVariables) {
      if (!this.currentBlockKnownVars?.isVariableDefined(varName)) {
        this.pushNotFoundVariableAnnotation(position, varName, expression);
      }
    }
  }

  private pushNotFoundVariableAnnotation(
    position: BlockPosition,
    varName: string,
    expression: Expression<string, TemplateEngine>
  ) {
    let message: string;
    if (varName === "@") {
      message = INVALID_VARIABLE_GENERIC_MESSAGE;
    } else if (varName.startsWith("@")) {
      message = `Variable "${varName}" might not be defined`;
    } else if (varName.trim() === "") {
      message = NO_VARIABLE_PROVIDED_MESSAGE;
    } else {
      message = VARIABLE_SHOULD_START_WITH_AT_MESSAGE;
    }

    if (
      this.annotations.some(
        (x) => x.message === message && x.position.path === position.path
      )
    ) {
      return;
    }

    this.annotations.push({
      position,
      message,
      analysisId: this.id,
      type: AnnotationType.Warning,
      detail: {
        expression,
      },
    });
  }

  override visitPipeline(
    position: BlockPosition,
    pipeline: BlockConfig[],
    extra: VisitPipelineExtra
  ) {
    // Getting element key for sub pipeline if applicable (e.g. for a for-each, try-except, block)
    const subPipelineInput =
      extra.parentNode && extra.pipelinePropName
        ? getVariableKeyForSubPipeline(extra.parentNode, extra.pipelinePropName)
        : null;

    // Before visiting the sub pipeline, we need to save the current context
    this.contextStack.push(this.previousVisitedBlock);

    let subPipelineVars: VarMap;
    if (subPipelineInput) {
      subPipelineVars = new VarMap();
      subPipelineVars.setOutputKeyExistence({
        // The source of the element key is the parent block
        source: extra.parentPosition.path,
        outputKey: `@${subPipelineInput}`,
        existence: VarExistence.DEFINITELY,
        allowAnyChild: true,
      });
    }

    // Creating context for the sub pipeline
    this.previousVisitedBlock = {
      vars: this.previousVisitedBlock.vars,
      output: subPipelineVars,
    };

    super.visitPipeline(position, pipeline, extra);

    // Restoring the context of the parent pipeline
    this.previousVisitedBlock = this.contextStack.pop();
  }

  async run(extension: FormState): Promise<void> {
    this.allBlocks = await blockRegistry.allTyped();

    const contextVars = new VarMap();

    // Order of the following calls will determine the order of the sources in the UI
    await setOptionsVars(extension, contextVars);
    await setServiceVars(extension, contextVars);
    await setInputVars(extension, contextVars);

    this.previousVisitedBlock = {
      vars: contextVars,
      output: null,
    };

    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }

  /**
   * Visit a Document Builder ListElement body.
   *
   * The ListElement body is a deferred expression that is evaluated with the elementKey available on each rendering
   * of an item.
   *
   * @param position the position of the document builder block
   * @param blockConfig the block config of the document builder block
   * @param element the ListElement within the document
   * @param pathInBlock the path of the ListElement within the document config
   */
  visitListElementBody({
    position,
    blockConfig,
    element,
    pathInBlock,
  }: VisitDocumentElementArgs) {
    const variableName = element.config.elementKey ?? "element";
    const listBodyExpression = element.config.element;

    // `element` of ListElement should always be a deferred expression. But guard just in case.
    if (isDeferExpression(listBodyExpression)) {
      // Before visiting the deferred expression, we need to save the current context
      this.contextStack.push(this.previousVisitedBlock);

      let deferredExpressionVars: VarMap;
      if (typeof variableName === "string") {
        deferredExpressionVars = new VarMap();
        deferredExpressionVars.setOutputKeyExistence({
          source: position.path,
          outputKey: `@${variableName}`,
          existence: VarExistence.DEFINITELY,
          // XXX: type should be derived from the known array item type from the list
          allowAnyChild: true,
        });
      }

      this.currentBlockKnownVars = this.previousVisitedBlock.vars.clone();
      this.currentBlockKnownVars.addSourceMap(deferredExpressionVars);
      this.knownVars.set(
        joinPathParts(
          position.path,
          pathInBlock,
          "config",
          "element",
          "__value__"
        ),
        this.currentBlockKnownVars
      );

      // Creating context for the sub-pipeline
      this.previousVisitedBlock = {
        vars: this.previousVisitedBlock.vars,
        output: deferredExpressionVars,
      };

      this.visitDocumentElement({
        position,
        blockConfig,
        element: (element as ListDocumentElement).config.element.__value__,
        pathInBlock: joinPathParts(
          pathInBlock,
          "config",
          "element",
          "__value__"
        ),
      });

      // Restoring the context of the parent pipeline
      this.previousVisitedBlock = this.contextStack.pop();
      this.currentBlockKnownVars = this.previousVisitedBlock.vars.clone();
    }
  }

  override visitDocumentElement({
    position,
    blockConfig,
    element,
    pathInBlock,
  }: VisitDocumentElementArgs) {
    if (element.type === "list") {
      for (const [prop, value] of Object.entries(element.config)) {
        // ListElement provides an elementKey to the deferred expression in its body
        if (prop === "element") {
          this.visitListElementBody({
            position,
            blockConfig,
            element,
            pathInBlock,
          });
        } else if (isExpression(value)) {
          this.visitExpression(
            nestedPosition(position, pathInBlock, "config", prop),
            value
          );
        }
      }
    } else {
      super.visitDocumentElement({
        position,
        blockConfig,
        element,
        pathInBlock,
      });
    }
  }
}

export default VarAnalysis;
