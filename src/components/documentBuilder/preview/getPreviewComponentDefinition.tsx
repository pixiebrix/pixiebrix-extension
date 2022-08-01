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
  DynamicPath,
  PipelineDocumentConfig,
  PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import { get, set } from "lodash";
import { UnknownObject } from "@/types";
import { isExpression } from "@/runtime/mapArgs";
import cx from "classnames";
import React from "react";
import { Button } from "react-bootstrap";
import { getComponentDefinition } from "@/components/documentBuilder/documentTree";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import Unknown from "./elementsPreview/Unknown";
import Basic from "./elementsPreview/Basic";
import Image from "./elementsPreview/Image";
import Container from "./elementsPreview/Container";
import Flaps from "./flaps/Flaps";
import filterCssClassesForPreview from "./filterCssClassesForPreview";

// Bookkeeping trace paths for preview is not necessary. But, we need to provide a value for the previews that use
// getComponentDefinition under the hood
const DUMMY_TRACE_PATH: DynamicPath = { staticId: "preview", branches: [] };

function filterClass(props: unknown | undefined) {
  if (typeof props === "object" && "className" in props) {
    props.className = filterCssClassesForPreview(props.className as string);
  }
}
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
      const documentComponent = getComponentDefinition(
        element,
        DUMMY_TRACE_PATH
      );
      filterClass(documentComponent.props);

      return {
        Component: Basic,
        props: {
          elementType: element.type,
          documentComponent,
        },
      };
    }

    case "image": {
      const documentComponent = getComponentDefinition(
        element,
        DUMMY_TRACE_PATH
      );
      filterClass(documentComponent.props);

      return {
        Component: Image,
        props: {
          elementType: element.type,
          documentComponent,
        },
      };
    }

    case "container":
    case "row":
    case "column": {
      const documentComponent = getComponentDefinition(
        element,
        DUMMY_TRACE_PATH
      );
      filterClass(documentComponent.props);

      return {
        Component: Container,
        props: {
          element,
          documentComponent,
        },
      };
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

      const { Component, props } = getComponentDefinition(
        previewElement,
        DUMMY_TRACE_PATH
      );
      filterClass(props);

      const PreviewComponent: React.FC<PreviewComponentProps> = ({
        children,
        className,
        isHovered,
        isActive,
        documentBodyName,
        elementName,
        ...restPreviewProps
      }) => (
        <div
          className={cx(documentTreeStyles.shiftRightWrapper, className)}
          {...restPreviewProps}
        >
          <Flaps
            className={documentTreeStyles.flapShiftRight}
            elementType={element.type}
            documentBodyName={documentBodyName}
            elementName={elementName}
            isHovered={isHovered}
            isActive={isActive}
          />
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
        isActive,
        documentBodyName,
        elementName,
        ...restPreviewProps
      }) => (
        <div
          className={cx(documentTreeStyles.shiftRightWrapper, className)}
          {...restPreviewProps}
        >
          <Flaps
            className={documentTreeStyles.flapShiftRight}
            elementType={element.type}
            documentBodyName={documentBodyName}
            elementName={elementName}
            isHovered={isHovered}
            isActive={isActive}
          />
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
        isActive,
        documentBodyName,
        elementName,
        ...restPreviewProps
      }) => {
        // Destructure disabled from button props. If the button is disabled in the preview the user can't select it
        // to configure the button
        const { title, onClick, disabled, ...buttonProps } = config;
        filterClass(buttonProps);

        return (
          <div>
            <div
              className={cx(className, documentTreeStyles.inlineWrapper)}
              {...restPreviewProps}
            >
              <Flaps
                className={documentTreeStyles.flapShiftRight}
                elementType={element.type}
                documentBodyName={documentBodyName}
                elementName={elementName}
                isHovered={isHovered}
                isActive={isActive}
              />
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
        documentBodyName,
        elementName,
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
          <Flaps
            className={documentTreeStyles.flapShiftUp}
            elementType={element.type}
            documentBodyName={documentBodyName}
            elementName={elementName}
            isHovered={isHovered}
            isActive={isActive}
          />
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
      const documentComponent = getComponentDefinition(
        element,
        DUMMY_TRACE_PATH
      );
      filterClass(documentComponent.props);

      return {
        Component: Unknown,
        props: {
          documentComponent,
        },
      };
    }
  }
}

export default getPreviewComponentDefinition;
