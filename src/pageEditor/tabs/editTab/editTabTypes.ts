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

/*
 * FormikError.
 * It can be a string, a record of strings, or a record of records... i.e. it is dynamic and depends on the level of the state tree where the error happens.
 * It is never an array although we can get a nested error using index (number),
 * when the values state is represented by an array (ex. with the BlockPipeline, we'll do `PipelineErrors[0]`).
 * Keep in mind that despite it looks like an array (the top-level may look like an array - have numbers for property names), it is an object.
 * For instance, it doesn't have a `length` property.
 */

import { MoveBrickControlProps } from "@/pageEditor/tabs/editTab/editorNodes/brickNode/MoveBrickControl";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import React from "react";
import { OutputKey } from "@/core";

export type FormikError = string | FormikErrorTree;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record creates a circular ref
export type FormikErrorTree = {
  [key: number | string]: FormikError;
};

export enum RunStatus {
  NONE,
  SUCCESS,
  SKIPPED,
  WARNING,
  ERROR,
}

export type BrickNodeContentProps = {
  icon?: IconProp | React.ReactNode;
  runStatus?: RunStatus;
  brickLabel: string;
  outputKey?: OutputKey;
};

export type BrickNodeProps = BrickNodeContentProps &
  MoveBrickControlProps & {
    onClick?: () => void;
    active?: boolean;
    parentIsActive?: boolean;
    nestingLevel: number;
    hasSubPipelines?: boolean;
    collapsed?: boolean;
    nodeActions: NodeAction[];
    showBiggerActions?: boolean;
    trailingMessage?: string;
  };
