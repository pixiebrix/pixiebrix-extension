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

import { BlockPosition } from "@/blocks/types";
import { UUID } from "@/core";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import VarMap from "./analysisVisitors/varAnalysis/varMap";

export enum AnnotationType {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export type Annotation = {
  /**
   * Position of the annotation within the extension configuration
   */
  position: BlockPosition;
  /**
   * A user-readable message for the annotation
   */
  message: string;
  /**
   * Unique identifier for analysis that created this annotation
   */
  analysisId: string;
  /**
   * The type of annotation
   */
  type: AnnotationType;
  /**
   * Custom data produced by the analysis
   */
  detail?: unknown;
};

export interface Analysis {
  /**
   * Unique identifier for this analysis
   */
  readonly id: string;

  /**
   * Return the produced annotations
   */
  getAnnotations(): Annotation[];

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
  extensionAnnotations: Record<UUID, Annotation[]>;

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
