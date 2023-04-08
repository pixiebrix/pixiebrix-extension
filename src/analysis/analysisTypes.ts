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

import { type BlockPosition } from "@/blocks/types";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import type VarMap from "./analysisVisitors/varAnalysis/varMap";
import { BaseAnnotation } from "@/types/annotationTypes";
import { UUID } from "@/types/stringTypes";

export enum AnalysisAnnotationActionType {
  AddValueToArray,
}

export type AnalysisAnnotationAction = {
  caption: string;
  type: AnalysisAnnotationActionType;
  path: string;
  value?: unknown;
  extraCallback?: () => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type AnalysisAnnotation = BaseAnnotation & {
  /**
   * Position of the annotation within the extension configuration
   */
  position: BlockPosition;
  /**
   * Unique identifier for analysis that created this annotation
   */
  analysisId: string;
  /**
   * Custom data produced by the analysis
   */
  detail?: unknown;
  /**
   * Actions that can be taken to fix the issue identified during analysis
   */
  actions?: AnalysisAnnotationAction[];
};

export interface Analysis {
  /**
   * Unique identifier for this analysis
   */
  readonly id: string;

  /**
   * Return the produced annotations
   */
  getAnnotations(): AnalysisAnnotation[];

  /**
   * Run the analysis on the given extension
   * @param extension The extension to analyze
   */
  run(extension: FormState): void | Promise<void>;
}

export type AnalysisState = {
  /**
   * Annotations stored by extension ID
   */
  extensionAnnotations: Record<UUID, AnalysisAnnotation[]>;

  /**
   * Known variables
   * stored for each block by block path (string key of the Map)
   * withing an extension (the UUID key of the Record)
   */
  knownVars: Record<UUID, Map<string, VarMap>>;
};

export type AnalysisRootState = {
  analysis: AnalysisState;
};
