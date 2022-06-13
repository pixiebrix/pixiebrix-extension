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

import documentTreeStyles from "./documentTree.module.scss";
import {
  DocumentComponent,
  DocumentElement,
  PipelineDocumentConfig,
  PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import { get } from "lodash";
import { UnknownObject } from "@/types";
import { isExpression } from "@/runtime/mapArgs";
import cx from "classnames";
import React from "react";
import { Button } from "react-bootstrap";
import { getComponentDefinition } from "@/components/documentBuilder/documentTree";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import HoveredLabel from "./HoveredLabel";
import ActiveLabel from "./ActiveLabel";
import Basic from "./elementsPreview/Basic";

function getPreviewComponentDefinition(
  element: DocumentElement
): DocumentComponent {
  const componentType = String(element.type);
  const config = get(element, "config", {} as UnknownObject);

  switch (componentType) {
    case "header_1":
    case "header_2":
    case "header_3":
    case "text": {
      const { Component, props } = getComponentDefinition(element);
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        children,
        className,
        isHovered,
        isActive,
        onSelectParent,
        ...restPreviewProps
      }) => (
        <div
          className={cx(documentTreeStyles.wrapperShiftRight, className)}
          {...restPreviewProps}
        >
          {isHovered && (
            <HoveredLabel
              className={documentTreeStyles.labelShiftRight}
              elementType={element.type}
            />
          )}
          {isActive && (
            <ActiveLabel
              className={documentTreeStyles.labelShiftRight}
              selectParent={onSelectParent}
            />
          )}
          <Component {...props} />
        </div>
      );

      return { Component: PreviewComponent, props };
    }

    case "container":
    case "row":
    case "column": {
      const { Component, props } = getComponentDefinition(element);
      props.className = cx(props.className, documentTreeStyles.container);
      if (!element.children?.length) {
        props.children = <span className="text-muted">{componentType}</span>;
      }

      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        children,
        isHovered,
        isActive,
        onSelectParent,
        ...restPreviewProps
      }) => (
        <Component {...restPreviewProps}>
          {isHovered && (
            <HoveredLabel
              className={documentTreeStyles.labelShiftUp}
              elementType={element.type}
            />
          )}
          {children}
        </Component>
      );

      return { Component: PreviewComponent, props };
    }

    case "card": {
      const { heading } = config;

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
        className,
        isHovered,
        ...restPreviewProps
      }) => (
        <div
          className={cx(documentTreeStyles.wrapperShiftRight, className)}
          {...restPreviewProps}
        >
          {isHovered && (
            <HoveredLabel
              className={documentTreeStyles.labelShiftRight}
              elementType={element.type}
            />
          )}
          <Component {...props}>{children}</Component>
        </div>
      );

      return { Component: PreviewComponent };
    }

    case "pipeline": {
      const { pipeline } = config as PipelineDocumentConfig;
      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        className,
        isHovered,
        ...restPreviewProps
      }) => (
        <div
          className={cx(documentTreeStyles.wrapperShiftRight, className)}
          {...restPreviewProps}
        >
          {isHovered && (
            <HoveredLabel
              className={documentTreeStyles.labelShiftRight}
              elementType={element.type}
            />
          )}
          <h3>{elementTypeLabels.pipeline}</h3>
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
        isHovered,
        ...restPreviewProps
      }) => {
        // Destructure disabled from button props. If the button is disabled in the preview the user can't select it
        // to configure the button
        const { title, onClick, disabled, ...buttonProps } = config;

        return (
          <div>
            <div
              className={cx(
                className,
                documentTreeStyles.inlineWrapper,
                documentTreeStyles.wrapperShiftRight
              )}
              {...restPreviewProps}
            >
              {isHovered && (
                <HoveredLabel
                  className={documentTreeStyles.labelShiftRight}
                  elementType={element.type}
                />
              )}
              <Button onClick={() => {}} {...buttonProps}>
                {title}
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
        isHovered,
        isActive,
        onSelectParent,
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
          {isHovered && (
            <HoveredLabel
              className={documentTreeStyles.labelShiftUp}
              elementType={element.type}
            />
          )}
          {isActive && (
            <ActiveLabel
              className={documentTreeStyles.labelShiftUp}
              selectParent={onSelectParent}
            />
          )}
          <div className="text-muted">List: {arrayValue}</div>
          <div className="text-muted">
            Element key: @{config.elementKey || "element"}
          </div>
          {children}
        </div>
      );

      return { Component: PreviewComponent };
    }

    default: {
      const previewDocumentComponent = getComponentDefinition(element);
      return {
        Component: Basic,
        props: {
          previewDocumentComponent,
        },
      };
    }
  }
}

export default getPreviewComponentDefinition;
