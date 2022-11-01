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
import { VisitBlockExtra, VisitPipelineExtra } from "@/blocks/PipelineVisitor";
import { BlockPosition, BlockConfig } from "@/blocks/types";
import { Expression } from "@/core";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getInputKeyForSubPipeline } from "@/pageEditor/utils";
import { isVarExpression } from "@/runtime/mapArgs";
import { makeServiceContext } from "@/services/serviceUtils";
import { isEmpty, pick } from "lodash";
import extensionPointRegistry from "@/extensionPoints/registry";
import { makeInternalId } from "@/registry/internal";
import { Analysis, Annotation, AnnotationType } from "@/analysis/analysisTypes";
import VarMap, { VarExistence } from "./varMap";
import { TraceRecord } from "@/telemetry/trace";
import { mergeReaders } from "@/blocks/readers/readerUtils";

type PreviousVisitedBlock = {
  vars: VarMap;
  output: VarMap | null;
};

async function setServiceVars(extension: FormState, contextVars: VarMap) {
  const serviceContext = extension.services?.length
    ? await makeServiceContext(extension.services)
    : null;

  if (serviceContext != null) {
    contextVars.setExistenceFromObj(serviceContext);
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
  for (const key of readerKeys) {
    contextVars.setExistence(`@input.${key}`, VarExistence.DEFINITELY);
  }
}

function setOptionsVars(extension: FormState, contextVars: VarMap) {
  // TODO: should we check the blueprint definition instead?
  if (!isEmpty(extension.optionsArgs)) {
    contextVars.setExistenceFromObj(extension.optionsArgs, "@options.");
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
    this.currentBlockKnownVars =
      this.previousVisitedBlock.output == null
        ? this.previousVisitedBlock.vars.clone()
        : this.previousVisitedBlock.vars.merge(
            this.previousVisitedBlock.output
          );

    const traceRecord = this.trace.find(
      (x) =>
        x.blockInstanceId === blockConfig.instanceId &&
        x.templateContext != null
    );
    if (traceRecord != null) {
      this.currentBlockKnownVars.setExistenceFromObj(
        traceRecord.templateContext
      );
    }

    this.knownVars.set(position.path, this.currentBlockKnownVars);

    this.previousVisitedBlock = {
      vars: this.currentBlockKnownVars,
      output: null,
    };

    if (blockConfig.outputKey) {
      const currentBlockOutput = new VarMap();
      currentBlockOutput.setExistence(
        `@${blockConfig.outputKey}`,
        blockConfig.if == null ? VarExistence.DEFINITELY : VarExistence.MAYBE
      );

      // TODO get the output schema and use its properties to be more precise
      currentBlockOutput.setExistence(
        `@${blockConfig.outputKey}.*`,
        VarExistence.MAYBE
      );

      this.previousVisitedBlock.output = currentBlockOutput;
    }

    super.visitBlock(position, blockConfig, extra);
  }

  override visitExpression(
    position: BlockPosition,
    expression: Expression<unknown>
  ): void {
    if (!isVarExpression(expression)) {
      return;
    }

    const varName = expression.__value__;
    if (varName == null) {
      return;
    }

    if (this.currentBlockKnownVars?.getExistence(varName) == null) {
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
      subPipelineVars.setExistence(
        `@${subPipelineInput}`,
        VarExistence.DEFINITELY
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
