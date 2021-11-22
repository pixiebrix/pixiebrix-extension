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
import { Card, Col, Container, Row } from "react-bootstrap";
import { get } from "lodash";
import { UnknownObject } from "@/types";
import { isPipelineExpression } from "@/runtime/mapArgs";
import PipelineComponent from "./PipelineComponent";
import DocumentButton from "./DocumentButton";

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

export function getComponent(
  body: any
): { Component: React.ComponentType | string; props: UnknownObject } {
  const componentType = String(body.type);
  const config = get(body, "config", {});

  switch (componentType) {
    case "header_1":
    case "header_2":
    case "header_3": {
      const { title, ...props } = config;
      props.children = title;

      // eslint-disable-next-line security/detect-object-injection -- componentType is header_1, header_2, or header_3
      return { Component: headerComponents[componentType], props };
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
      props.children = body.children.map((child: any, i: number) => {
        const { Component: ChildComponent, props: childProps } = getComponent(
          child
        );
        return <ChildComponent key={i} {...childProps} />;
      });

      // eslint-disable-next-line security/detect-object-injection -- componentType is container, row, or column
      return { Component: gridComponents[componentType], props };
    }

    case "card": {
      const { heading, body, ...cardProps } = config;
      const Component = () => (
        <Card {...cardProps}>
          <Card.Header>{heading}</Card.Header>
          <Card.Body>
            {isPipelineExpression(body) ? (
              <PipelineComponent pipeline={body.__value__} />
            ) : (
              body
            )}
          </Card.Body>
        </Card>
      );
      return {
        Component,
        props: undefined,
      };
    }

    case "block": {
      // ToDo update
      const pipeline = get(body, "config.pipeline");
      if (!isPipelineExpression(pipeline)) {
        throw new Error("Expected pipeline expression for pipeline");
      }

      return {
        Component: PipelineComponent,
        props: {
          pipeline: pipeline.__value__,
        },
      };
    }

    case "button": {
      const { title, onClick, ...props } = config;
      if (!isPipelineExpression(onClick)) {
        throw new Error("Expected pipeline expression for onClick");
      }

      return {
        Component: DocumentButton,
        props: {
          children: title,
          onClick: onClick.__value__,
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
