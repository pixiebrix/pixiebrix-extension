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

import React, { type ElementType } from "react";
import BlockElement from "@/components/documentBuilder/render/BlockElement";
import { isPipelineExpression } from "@/runtime/mapArgs";
import { type UnknownObject } from "@/types/objectTypes";
import { get } from "lodash";
import { Col, Container, Row, Image } from "react-bootstrap";
import {
  type BuildDocumentBranch,
  type ButtonDocumentConfig,
  type DocumentComponent,
  type DocumentElement,
  type DynamicPath,
  type PipelineDocumentConfig,
} from "./documentBuilderTypes";
import ButtonElement from "@/components/documentBuilder/render/ButtonElement";
import ListElement from "@/components/documentBuilder/render/ListElement";
import { BusinessError } from "@/errors/businessErrors";
import { joinPathParts } from "@/utils";
import Markdown from "@/components/Markdown";
import CardElement from "./render/CardElement";

const headerComponents = {
  header_1: "h1",
  header_2: "h2",
  header_3: "h3",
} as const;

const headingComponents = ["h1", "h2", "h3"];

const gridComponents = {
  container: Container,
  row: Row,
  column: Col,
} as const;

const UnknownType: React.FC<{ componentType: string }> = ({
  componentType,
}) => (
  <div className="text-danger">Unknown component type: {componentType}</div>
);

// eslint-disable-next-line complexity
export function getComponentDefinition(
  element: DocumentElement,
  tracePath: DynamicPath
): DocumentComponent {
  const componentType = element.type;
  const config = get(element, "config", {} as UnknownObject);

  switch (componentType) {
    // Provide backwards compatibility for old elements
    case "header_1":
    case "header_2":
    case "header_3": {
      const { title, ...props } = config;
      props.children = title;

      return {
        // eslint-disable-next-line security/detect-object-injection -- componentType is header_1, header_2, or header_3
        Component: headerComponents[componentType],
        props,
      };
    }

    case "header": {
      const { title, heading, ...props } = config;
      props.children = title;

      return {
        Component: headingComponents.includes(heading as string)
          ? (heading as ElementType)
          : "h1",
        props,
      };
    }

    case "text": {
      const { text, enableMarkdown, ...props } = config;
      if (enableMarkdown) {
        return {
          Component: Markdown,
          props: { ...props, markdown: text },
        };
      }

      props.children = text;
      return { Component: "p", props };
    }

    case "image": {
      const { url, ...props } = config;
      props.src = url;
      props.height = props.height ?? 50;
      return { Component: Image, props };
    }

    case "container":
    case "row":
    case "column": {
      const props = { ...config };

      // eslint-disable-next-line security/detect-object-injection -- componentType is container, row, or column
      return { Component: gridComponents[componentType], props };
    }

    case "card": {
      const props = { ...config };

      return {
        Component: CardElement,
        props,
      };
    }

    case "pipeline": {
      const { pipeline } = config as PipelineDocumentConfig;

      if (pipeline !== undefined && !isPipelineExpression(pipeline)) {
        console.debug("Expected pipeline expression for pipeline", {
          componentType: "pipeline",
          config,
        });
        throw new BusinessError("Expected pipeline expression for pipeline");
      }

      return {
        Component: BlockElement,
        props: {
          pipeline: pipeline.__value__,
          tracePath,
        },
      };
    }

    case "button": {
      const { title, onClick, variant, size, className } =
        config as ButtonDocumentConfig;
      if (onClick !== undefined && !isPipelineExpression(onClick)) {
        console.debug("Expected pipeline expression for onClick", {
          componentType: "button",
          config,
        });
        throw new BusinessError("Expected pipeline expression for onClick");
      }

      return {
        Component: ButtonElement,
        props: {
          children: title,
          onClick: onClick.__value__,
          tracePath,
          variant,
          size,
          className,
        },
      };
    }

    case "list": {
      const props = {
        array: config.array,
        elementKey: config.elementKey,
        config: config.element,
        tracePath,
        buildDocumentBranch,
      };

      return {
        Component: ListElement,
        props,
      };
    }

    default: {
      return {
        Component: UnknownType,
        props: { componentType: componentType ?? "No Type Provided" },
      };
    }
  }
}

export const buildDocumentBranch: BuildDocumentBranch = (root, tracePath) => {
  const { staticId, branches } = tracePath;
  const componentDefinition = getComponentDefinition(root, tracePath);
  if (root.children?.length > 0) {
    componentDefinition.props.children = root.children.map((child, index) => {
      const { Component, props } = buildDocumentBranch(child, {
        staticId: joinPathParts(staticId, root.type, "children"),
        branches: [...branches, { staticId, index }],
      });
      return <Component key={index} {...props} />;
    });
  }

  return componentDefinition;
};
