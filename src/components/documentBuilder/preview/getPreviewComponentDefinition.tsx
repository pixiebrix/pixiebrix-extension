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

import {
  ButtonDocumentConfig,
  DocumentComponent,
  DocumentElement,
  PipelineDocumentConfig,
} from "@/components/documentBuilder/documentBuilderTypes";
import { get } from "lodash";
import { UnknownObject } from "@/types";
import { isExpression } from "@/runtime/mapArgs";
import cx from "classnames";
import documentTreeStyles from "./documentTree.module.scss";
import React from "react";
import { Button } from "react-bootstrap";
import { getComponentDefinition } from "@/components/documentBuilder/documentTree";
import { Expression } from "@/core";

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

function getPreviewComponentDefinition(
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

export default getPreviewComponentDefinition;
