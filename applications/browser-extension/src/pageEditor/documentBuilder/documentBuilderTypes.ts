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

import {
  type DeferExpression,
  type Expression,
  type PipelineExpression,
} from "../../types/runtimeTypes";
import { type ElementType, type MouseEventHandler, type Ref } from "react";
import type { IconConfig } from "../../types/iconTypes";
import { isObject } from "../../utils/objectUtils";

export const DOCUMENT_BUILDER_ELEMENT_TYPES = [
  "header",
  "text",
  "image",
  "container",
  "row",
  "column",
  "card",
  "pipeline",
  "button",
  "list",

  // For backwards compatibility
  "header_1",
  "header_2",
  "header_3",
] as const;

export type DocumentBuilderElementType =
  (typeof DOCUMENT_BUILDER_ELEMENT_TYPES)[number];

export type DocumentBuilderElement<
  TType extends DocumentBuilderElementType = DocumentBuilderElementType,
  TConfig = UnknownObject,
> = {
  type: TType;
  config: TConfig;
  children?: DocumentBuilderElement[];
};

function isDocumentBuilderElement(
  value: unknown,
): value is DocumentBuilderElement {
  return isObject(value) && "type" in value && "config" in value;
}

export function isDocumentBuilderElementArray(
  value: unknown,
): value is DocumentBuilderElement[] {
  return (
    Array.isArray(value) && value.every((x) => isDocumentBuilderElement(x))
  );
}

type ListElementConfig = {
  array: Expression;
  elementKey?: string;
  element: DeferExpression<DocumentBuilderElement>;
};
export type ListElement = DocumentBuilderElement<"list", ListElementConfig>;

export function isListElement(
  element: DocumentBuilderElement,
): element is ListElement {
  return element.type === "list";
}

export type PipelineElementConfig = {
  label: string;
  pipeline: PipelineExpression;
};
type PipelineElement = DocumentBuilderElement<
  "pipeline",
  PipelineElementConfig
>;

export function isPipelineElement(
  element: DocumentBuilderElement,
): element is PipelineElement {
  return element.type === "pipeline";
}

export type ButtonElementConfig = {
  title: string | Expression;
  tooltip?: string | Expression;
  icon?: IconConfig | Expression;
  variant?: string | Expression;
  /**
   * Default size type coming from React Bootstrap Button
   */
  size?: "sm" | "lg" | Expression<"sm" | "lg">;
  fullWidth?: boolean | Expression;
  disabled?: boolean | Expression;
  className?: string | Expression;
  onClick: PipelineExpression;
};
export type ButtonElement = DocumentBuilderElement<
  "button",
  ButtonElementConfig
>;

export function isButtonElement(
  element: DocumentBuilderElement,
): element is ButtonElement {
  return element.type === "button";
}

export type DocumentBuilderComponent = {
  Component: ElementType;
  props: UnknownObject;
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

export type BuildDocumentBuilderSubtree = (
  root: DocumentBuilderElement,
  tracePath: DynamicPath,
) => DocumentBuilderComponent | null;

export type PreviewComponentProps = {
  className?: string;
  elementRef: Ref<HTMLDivElement>;
  documentBodyName: string;
  elementName: string;
  isHovered: boolean;
  isActive: boolean;
  onClick: MouseEventHandler<HTMLDivElement>;
  onMouseEnter: MouseEventHandler<HTMLDivElement>;
  onMouseLeave: MouseEventHandler<HTMLDivElement>;
};
