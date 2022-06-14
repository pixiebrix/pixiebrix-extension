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

import { UnknownObject } from "@/types";
import { Expression } from "@/core";
import { DeferExpression, PipelineExpression } from "@/runtime/mapArgs";
import { ElementType, MouseEventHandler } from "react";

export const DOCUMENT_ELEMENT_TYPES = [
  "header_1",
  "header_2",
  "header_3",
  "text",
  "image",
  "container",
  "row",
  "column",
  "card",
  "pipeline",
  "button",
  "list",
] as const;

export type DocumentElementType = typeof DOCUMENT_ELEMENT_TYPES[number];

export type DocumentElement<
  TType extends DocumentElementType = DocumentElementType,
  TConfig = UnknownObject
> = {
  type: TType;
  config: TConfig;
  children?: DocumentElement[];
};

export type ListDocumentConfig = {
  array: Expression;
  elementKey?: string;
  element: DeferExpression<DocumentElement>;
};
export type ListDocumentElement = DocumentElement<"list", ListDocumentConfig>;

export function isListElement(
  element: DocumentElement
): element is ListDocumentElement {
  return element.type === "list";
}

export type PipelineDocumentConfig = {
  pipeline: PipelineExpression;
};
export type PipelineDocumentElement = DocumentElement<
  "pipeline",
  PipelineDocumentConfig
>;

export function isPipelineElement(
  element: DocumentElement
): element is PipelineDocumentElement {
  return element.type === "pipeline";
}

export type ButtonDocumentConfig = {
  title: string | Expression;
  variant?: string | Expression;
  // Default size type coming from Bootstrap Button
  size?: "sm" | "lg" | Expression<"sm" | "lg">;
  className?: string | Expression;
  onClick: PipelineExpression;
};
export type ButtonDocumentElement = DocumentElement<
  "button",
  ButtonDocumentConfig
>;

export function isButtonElement(
  element: DocumentElement
): element is ButtonDocumentElement {
  return element.type === "button";
}

export type DocumentComponent = {
  Component: ElementType;
  props?: UnknownObject | undefined;
};

/**
 * Document path information for keep tracking of brick call sites/calls for tracing
 * @since 1.7.0
 */
export type DynamicPath = {
  /**
   * The static path to the element in the pre-document.
   */
  staticId: string;

  /**
   * The branches to reach the element in the rendered document
   */
  branches: Array<{
    staticId: string;
    index: number;
  }>;
};

export type BuildDocumentBranch = (
  root: DocumentElement,
  tracePath: DynamicPath
) => DocumentComponent;

export type PreviewComponentProps = {
  className?: string;
  documentBodyName: string;
  elementName: string;
  isHovered: boolean;
  isActive: boolean;
  onClick: MouseEventHandler<HTMLDivElement>;
  onMouseEnter: MouseEventHandler<HTMLDivElement>;
  onMouseLeave: MouseEventHandler<HTMLDivElement>;
};
