/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import PipelineExpressionVisitor from "@/blocks/PipelineExpressionVisitor";
import {
  type VisitBlockExtra,
  type VisitPipelineExtra,
} from "@/blocks/PipelineVisitor";
import { type BlockPosition, type BlockConfig } from "@/blocks/types";
import { type Expression, type TemplateEngine } from "@/core";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getInputKeyForSubPipeline } from "@/pageEditor/utils";
import { isNunjucksExpression, isVarExpression } from "@/runtime/mapArgs";
import { makeServiceContext } from "@/services/serviceUtils";
import { isEmpty } from "lodash";
import {
  type Analysis,
  type Annotation,
  AnnotationType,
} from "@/analysis/analysisTypes";
import VarMap, { VarExistence } from "./varMap";
import { type TraceRecord } from "@/telemetry/trace";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import parseTemplateVariables from "./parseTemplateVariables";

type PreviousVisitedBlock = {
  vars: VarMap;
  output: VarMap | null;
};

async function setServiceVars(extension: FormState, contextVars: VarMap) {
  // Loop through all the services so we can set the source each service variable properly
  for (const service of extension.services ?? []) {
    // eslint-disable-next-line no-await-in-loop
    const serviceContext = await makeServiceContext([service]);
    contextVars.setExistenceFromValues(`root:${service.id}`, serviceContext);
  }
}

async function setInputVars(extension: FormState, contextVars: VarMap) {
  const readersConfig = extension.extensionPoint.definition.reader;
  if (readersConfig == null) {
    return;
  }

  const reader = await mergeReaders(readersConfig);
  const readerProperties = reader?.outputSchema?.properties;
  const readerKeys =
    readerProperties == null ? [] : Object.keys(readerProperties);

  if (readerKeys.length === 0) {
    return;
  }

  const inputContextShape: Record<string, boolean> = {};
  for (const key of readerKeys) {
    inputContextShape[key] = true;
  }

  contextVars.setExistenceFromValues(
    `root:${reader.id ?? reader.name ?? "reader"}`,
    inputContextShape,
    "@input"
  );
}

function setOptionsVars(extension: FormState, contextVars: VarMap) {
  // TODO: should we check the blueprint definition instead?
  if (!isEmpty(extension.optionsArgs)) {
    contextVars.setExistenceFromValues(
      `root:${extension.recipe.id}`,
      extension.optionsArgs,
      "@options"
    );
  }
}

class VarAnalysis extends PipelineExpressionVisitor implements Analysis {
  private readonly knownVars = new Map<string, VarMap>();
  private currentBlockKnownVars: VarMap;
  private previousVisitedBlock: PreviousVisitedBlock = null;
  private readonly contextStack: PreviousVisitedBlock[] = [];
  protected readonly annotations: Annotation[] = [];

  get id() {
    return "var";
  }

  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  getKnownVars() {
    return this.knownVars;
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
      this.currentBlockKnownVars.setExistenceFromValues(
        "trace",
        traceRecord.templateContext
      );
    }

    this.knownVars.set(position.path, this.currentBlockKnownVars);

    this.previousVisitedBlock = {
      vars: this.currentBlockKnownVars,
      output: null,
    };

    if (blockConfig.outputKey) {
      const outputVarName = `@${blockConfig.outputKey}`;
      const currentBlockOutput = new VarMap();
      currentBlockOutput.setOutputKeyExistence(
        position.path,
        outputVarName,
        blockConfig.if == null ? VarExistence.DEFINITELY : VarExistence.MAYBE,
        true
      );

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
    if (varName == null) {
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
    for (const varName of parseTemplateVariables(expression.__value__)) {
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
    this.annotations.push({
      position,
      message: `Variable "${varName}" might not be defined`,
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
    // Getting element key for sub pipeline if applicable (e.g. for a for-each block)
    const subPipelineInput =
      extra.parentNode && extra.pipelinePropName
        ? getInputKeyForSubPipeline(extra.parentNode, extra.pipelinePropName)
        : null;

    // Before visiting the sub pipeline, we need to save the current context
    this.contextStack.push(this.previousVisitedBlock);

    let subPipelineVars: VarMap;
    if (subPipelineInput) {
      subPipelineVars = new VarMap();
      subPipelineVars.setOutputKeyExistence(
        position.path,
        `@${subPipelineInput}`,
        VarExistence.DEFINITELY,
        false
      );
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
    const contextVars = new VarMap();

    await setServiceVars(extension, contextVars);
    await setInputVars(extension, contextVars);
    setOptionsVars(extension, contextVars);

    this.previousVisitedBlock = {
      vars: contextVars,
      output: null,
    };

    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }
}

export default VarAnalysis;
