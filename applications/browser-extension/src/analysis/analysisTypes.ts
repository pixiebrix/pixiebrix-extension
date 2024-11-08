/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type BrickPosition } from "../bricks/types";
import { type ModComponentFormState } from "../pageEditor/starterBricks/formStateTypes";
import type VarMap from "./analysisVisitors/varAnalysis/varMap";
import { type BaseAnnotation } from "@/types/annotationTypes";
import { type UUID } from "@/types/stringTypes";
import { type DraftModState } from "../pageEditor/store/editor/pageEditorTypes";

export enum AnalysisAnnotationActionType {
  AddValueToArray,
  UnsetValue,
}

export type AnalysisAnnotationAction = {
  caption: string;
  type: AnalysisAnnotationActionType;
  path: string;
  value?: unknown;
  extraCallback?: () => Promise<void>;
};

export type AnalysisAnnotation = BaseAnnotation & {
  /**
   * Position of the annotation within the extension configuration
   */
  position: BrickPosition;
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

/**
 * An analysis to run against the FormState for a single ModComponentBase.
 * @see ModComponentFormState
 */
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
   * Run the analysis on the given formState
   * @param formState The formState to analyze
   * @param modState The mod-level state to analyze
   */
  run(
    formState: ModComponentFormState,
    modState: DraftModState,
  ): void | Promise<void>;
}

export type AnalysisState = {
  /**
   * Annotations stored by extension ID
   */
  extensionAnnotations: Record<UUID, AnalysisAnnotation[]>;

  /**
   * Known variables as map: ModComponentBase Id -> block path -> VarMap
   * - Stored for each block by block path (string key of the Map)
   * - Within an extension (the UUID key of the Record)
   */
  knownVars: Record<UUID, Map<string, VarMap>>;

  /**
   * Known custom event names emitted by the `@pixiebrix/event` brick.
   *
   * Currently, all mod components are aware of the same event names.
   *
   * @since 1.7.34
   */
  knownEventNames: Record<UUID, string[]>;
};

export type AnalysisRootState = {
  analysis: AnalysisState;
};
