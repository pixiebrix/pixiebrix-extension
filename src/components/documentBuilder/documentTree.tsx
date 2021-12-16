/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React from "react";
import BlockElement from "@/components/documentBuilder/render/BlockElement";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { get } from "lodash";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import {
  BuildDocumentBranch,
  ButtonDocumentConfig,
  DocumentComponent,
  DocumentElement,
  PipelineDocumentConfig,
} from "./documentBuilderTypes";
import ButtonElement from "@/components/documentBuilder/render/ButtonElement";
import documentTreeStyles from "./documentTree.module.scss";
import cx from "classnames";
import ListElement from "@/components/documentBuilder/render/ListElement";
import { BusinessError } from "@/errors";
import { Expression } from "@/core";

const headerComponents = {
  header_1: "h1",
  header_2: "h2",
  header_3: "h3",
} as const;

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

export function getComponentDefinition(
  element: DocumentElement
): DocumentComponent {
  const componentType = element.type;
  const config = get(element, "config", {} as UnknownObject);

  switch (componentType) {
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

    case "text": {
      const { text, ...props } = config;
      props.children = text;

      return { Component: "p", props };
    }

    case "container":
    case "row":
    case "column": {
      const props = { ...config };

      // eslint-disable-next-line security/detect-object-injection -- componentType is container, row, or column
      return { Component: gridComponents[componentType], props };
    }

    case "card": {
      // The bodyPros is for internal use,
      // it allows to set CSS class need in preview to the body
      const { heading, children, bodyProps, ...cardProps } = config;
      const Component: React.FC = ({ children }) => (
        <Card {...cardProps}>
          <Card.Header>{heading}</Card.Header>
          <Card.Body {...bodyProps}>{children}</Card.Body>
        </Card>
      );
      return {
        Component,
        props: { children },
      };
    }

    case "pipeline": {
      const { pipeline } = config;

      if (typeof pipeline !== "undefined" && !isPipelineExpression(pipeline)) {
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
        },
      };
    }

    case "button": {
      const { title, onClick, ...props } = config;
      if (typeof onClick !== "undefined" && !isPipelineExpression(onClick)) {
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
          ...props,
        },
      };
    }

    case "list": {
      const props = {
        array: config.array,
        elementKey: config.elementKey,
        config: config.element,
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

type PreviewComponentProps = {
  className?: string;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
};

function getFieldValue<TValue extends string = string>(
  configValue: TValue | Expression<TValue>
): TValue {
  return isExpression(configValue) ? configValue.__value__ : configValue;
}

export function getPreviewComponentDefinition(
  element: DocumentElement
): DocumentComponent {
  const componentType = String(element.type);
  const config = get(element, "config", {} as UnknownObject);

  switch (componentType) {
    case "header_1":
    case "header_2":
    case "header_3": {
      const { title } = config;
      if (isExpression(title)) {
        const previewElement = {
          ...element,
          config: {
            ...config,
            title: title.__value__,
          },
        };
        return getComponentDefinition(previewElement);
      }

      return getComponentDefinition(element);
    }

    case "text": {
      const { text } = config;
      if (isExpression(text)) {
        const previewElement = {
          ...element,
          config: {
            ...config,
            text: text.__value__,
          },
        };
        return getComponentDefinition(previewElement);
      }

      return getComponentDefinition(element);
    }

    case "container":
    case "row":
    case "column": {
      const { Component, props } = getComponentDefinition(element);
      props.className = cx(props.className, documentTreeStyles.container);

      if (!element.children?.length) {
        props.children = <span className="text-muted">{componentType}</span>;
      }

      return { Component, props };
    }

    case "card": {
      let { heading } = config;
      if (isExpression(heading)) {
        heading = heading.__value__;
      }

      const previewElement = {
        ...element,
        config: {
          ...config,
          heading,
          bodyProps: { className: documentTreeStyles.container },
        },
      };

      const { Component, props } = getComponentDefinition(previewElement);
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        children,
        ...restPreviewProps
      }) => (
        <div {...restPreviewProps}>
          <Component {...props}>{children}</Component>
        </div>
      );

      return { Component: PreviewComponent };
    }

    case "pipeline": {
      const { pipeline } = config as PipelineDocumentConfig;
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        className,
        ...restPreviewProps
      }) => (
        <div className={cx(className)} {...restPreviewProps}>
          <h3>Block</h3>
          {pipeline.__value__.map(({ id }) => (
            <p key={id}>{id}</p>
          ))}
        </div>
      );

      return { Component: PreviewComponent };
    }

    case "button": {
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        className,
        ...restPreviewProps
      }) => {
        const {
          title,
          className: buttonClassName,
          size,
          variant,
        } = config as ButtonDocumentConfig;

        return (
          <div>
            <div
              className={cx(className, documentTreeStyles.inlineWrapper)}
              {...restPreviewProps}
            >
              <Button
                className={getFieldValue(buttonClassName)}
                size={getFieldValue(size)}
                variant={getFieldValue(variant)}
                onClick={() => {}}
              >
                {getFieldValue(title)}
              </Button>
            </div>
          </div>
        );
      };

      return { Component: PreviewComponent };
    }

    case "list": {
      const arrayValue = isExpression(config.array)
        ? config.array.__value__
        : String(config.array);
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        children,
        className,
        ...restPreviewProps
      }) => (
        <div
          className={cx(
            className,
            documentTreeStyles.container,
            documentTreeStyles.listContainer
          )}
          {...restPreviewProps}
        >
          <div className="text-muted">List: {arrayValue}</div>
          <div className="text-muted">
            Element key: @{config.elementKey || "element"}
          </div>
          {children}
        </div>
      );

      return { Component: PreviewComponent };
    }

    default:
      return getComponentDefinition(element);
  }
}

export const buildDocumentBranch: BuildDocumentBranch = (root) => {
  const componentDefinition = getComponentDefinition(root);
  if (root.children?.length > 0) {
    componentDefinition.props.children = root.children.map((child, index) => {
      const { Component, props } = buildDocumentBranch(child);
      return <Component key={index} {...props} />;
    });
  }

  return componentDefinition;
};
