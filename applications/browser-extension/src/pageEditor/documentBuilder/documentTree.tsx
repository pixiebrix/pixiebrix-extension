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

import React, { type ElementType } from "react";
import BlockElement from "./render/BlockElement";
import { get } from "lodash";
import { Col, Container, Row, Image } from "react-bootstrap";
import {
  type BuildDocumentBuilderSubtree,
  type ButtonElementConfig,
  type DocumentBuilderComponent,
  type DocumentBuilderElement,
  type DynamicPath,
  type PipelineElementConfig,
} from "./documentBuilderTypes";
import ButtonElement from "./render/ButtonElement";
import ListElement from "./render/ListElement";
import { BusinessError } from "@/errors/businessErrors";
import Markdown from "@/components/Markdown";
import CardElement from "./render/CardElement";
import { VALID_HEADER_TAGS } from "./allowedElementTypes";
import {
  isExpression,
  isPipelineExpression,
} from "../../utils/expressionUtils";
import { boolean } from "../../utils/typeUtils";
import { joinPathParts } from "../../utils/formUtils";
import Icon from "../../icons/Icon";
import cx from "classnames";
import styles from "./preview/documentTree.module.scss";

// Legacy header components, where each header type was a separate element
const HEADER_COMPONENTS = {
  header_1: "h1",
  header_2: "h2",
  header_3: "h3",
} as const;

const GRID_COMPONENTS = {
  container: Container,
  row: Row,
  column: Col,
} as const;

const UnknownType: React.FC<{ componentType: string }> = ({
  componentType,
}) => (
  <div className="text-danger">Unknown component type: {componentType}</div>
);

export const buildDocumentBuilderSubtree: BuildDocumentBuilderSubtree = (
  root,
  tracePath,
) => {
  const { staticId, branches } = tracePath;

  const { hidden: rawHidden } = root.config ?? {};
  const hidden = boolean(rawHidden);

  // We're excluding hidden elements from the DOM completely. HTML does have an attribute 'hidden' and Boostrap has
  // a `d-none` class, but those still include the element in the DOM. By excluding the element completely, we can
  // avoid brick and list computations.
  if (hidden) {
    return null;
  }

  const documentBuilderComponent = getDocumentBuilderComponent(root, tracePath);

  if (
    root.children?.length &&
    root.children.length > 0 &&
    documentBuilderComponent.props
  ) {
    documentBuilderComponent.props.children = root.children.map(
      (child, index) => {
        const subtree = buildDocumentBuilderSubtree(child, {
          staticId: joinPathParts(staticId, root.type, "children"),
          branches: [...branches, { staticId, index }],
        });

        if (subtree == null) {
          return null;
        }

        const { Component, props } = subtree;
        // eslint-disable-next-line react/no-array-index-key -- They have no other unique identifier
        return <Component key={index} {...props} />;
      },
    );
  }

  return documentBuilderComponent;
};

// eslint-disable-next-line complexity -- We're handling a lot of different element types
export function getDocumentBuilderComponent(
  documentComponentDefinition: DocumentBuilderElement,
  tracePath: DynamicPath,
): DocumentBuilderComponent {
  const componentType = documentComponentDefinition.type;
  // Destructure hidden from config, so we don't spread it onto components
  const { hidden, ...config } = get(
    documentComponentDefinition,
    "config",
    {} as UnknownObject,
  );

  switch (componentType) {
    // Provide backwards compatibility for old elements
    case "header_1":
    case "header_2":
    case "header_3": {
      const { title, ...props } = config;
      props.children = title;

      return {
        // eslint-disable-next-line security/detect-object-injection -- componentType is header_1, header_2, or header_3
        Component: HEADER_COMPONENTS[componentType],
        props,
      };
    }

    case "header": {
      const { title, heading, ...props } = config;
      props.children = title;

      return {
        Component: VALID_HEADER_TAGS.includes(heading as string)
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
      if (!props.height && !props.width) {
        // Fit image to screen of the size hasn't been defined
        // Defining it conditionally lets the user override it if the want the image to be in its natural size
        props.style = {
          maxWidth: "100%",
        } satisfies Partial<CSSStyleDeclaration>;
      }

      return { Component: Image, props };
    }

    case "container":
    case "row":
    case "column": {
      const props = { ...config, "data-testid": componentType };

      // eslint-disable-next-line security/detect-object-injection -- componentType is container, row, or column
      return { Component: GRID_COMPONENTS[componentType], props };
    }

    case "card": {
      const props = { ...config, "data-testid": componentType };

      return {
        Component: CardElement,
        props,
      };
    }

    case "pipeline": {
      const { pipeline } = config as PipelineElementConfig;

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
      const {
        title,
        tooltip,
        icon,
        onClick,
        variant,
        size,
        fullWidth,
        className,
        disabled,
      } = config as ButtonElementConfig;
      if (onClick !== undefined && !isPipelineExpression(onClick)) {
        throw new BusinessError("Expected pipeline expression for onClick");
      }

      const buttonContent = (
        <>
          {icon && !isExpression(icon) && (
            <Icon
              icon={icon.id}
              library={icon.library}
              className={cx({
                [styles.iconMargin ?? ""]: Boolean(title),
                [styles.iconMarginSm ?? ""]: Boolean(title) && size === "sm",
                [styles.iconMarginLg ?? ""]: Boolean(title) && size === "lg",
              })}
              color="currentColor"
              size="1em"
            />
          )}
          {title}
        </>
      );

      return {
        Component: ButtonElement,
        props: {
          children: buttonContent,
          tooltip,
          onClick: onClick.__value__,
          fullWidth,
          tracePath,
          variant,
          disabled,
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
        buildDocumentBuilderSubtree,
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
