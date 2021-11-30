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

/* eslint-disable jsx-a11y/click-events-have-key-events -- for the onClick events on Preview wrappers div */
/* eslint-disable jsx-a11y/no-static-element-interactions -- for the onClick events on Preview wrappers div */
import React from "react";
import BlockPipeline from "@/components/documentBuilder/DocumentBlock";
import { isExpression, isPipelineExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { get } from "lodash";
import { Card, Col, Container, Row } from "react-bootstrap";
import { DocumentComponent, DocumentElement } from "./documentBuilderTypes";
import DocumentButton from "@/components/documentBuilder/DocumentButton";
import useNotifications from "@/hooks/useNotifications";
import styles from "./ElementPreview.module.scss";
import cx from "classnames";

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
}) => <span>Unknown type: {componentType}</span>;

export function getComponentDefinition(
  element: DocumentElement
): DocumentComponent {
  const componentType = String(element.type);
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

    case "block": {
      const { pipeline } = config;
      if (typeof pipeline !== "undefined" && !isPipelineExpression(pipeline)) {
        throw new Error("Expected pipeline expression for pipeline");
      }

      return {
        Component: BlockPipeline,
        props: {
          pipeline: pipeline?.__value__,
        },
      };
    }

    case "button": {
      const { title, onClick, ...props } = config;
      if (typeof onClick !== "undefined" && !isPipelineExpression(onClick)) {
        throw new Error("Expected pipeline expression for onClick");
      }

      return {
        Component: DocumentButton,
        props: {
          children: title,
          onClick: onClick?.__value__,
          ...props,
        },
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
  onClick: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
};

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
      props.className = cx(props.className, styles.container);

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
          bodyProps: { className: styles.container },
        },
      };

      const { Component, props } = getComponentDefinition(previewElement);
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        onClick,
        className,
        children,
      }) => (
        <div onClick={onClick} className={className}>
          <Component {...props}>{children}</Component>
        </div>
      );

      return { Component: PreviewComponent };
    }

    case "block": {
      const pipeline = get(element, "config.pipeline", "");
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        onClick,
        className,
      }) => (
        <div onClick={onClick} className={className}>
          <h3>Block</h3>
          <p>{pipeline}</p>
        </div>
      );

      return { Component: PreviewComponent };
    }

    case "button": {
      const { Component, props } = getComponentDefinition(element);
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        onClick,
        className,
      }) => {
        const notify = useNotifications();
        return (
          <div onClick={onClick} className={className}>
            <Component
              {...props}
              onClick={() => {
                notify.info("Action button clicked.");
              }}
            />
          </div>
        );
      };

      return { Component: PreviewComponent };
    }

    default:
      return getComponentDefinition(element);
  }
}

export function buildDocumentBranch(root: DocumentElement): DocumentComponent {
  const componentDefinition = getComponentDefinition(root);
  if (root.children?.length > 0) {
    componentDefinition.props.children = root.children.map((child, i) => {
      const { Component, props } = buildDocumentBranch(child);
      return <Component key={i} {...props} />;
    });
  }

  return componentDefinition;
}
