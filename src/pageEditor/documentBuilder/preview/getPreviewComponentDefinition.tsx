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

import documentTreeStyles from "./documentTree.module.scss";
import {
  type ButtonElementConfig,
  type DocumentBuilderComponent,
  type DocumentBuilderElement,
  type DynamicPath,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { get } from "lodash";
import { getDocumentBuilderComponent } from "@/pageEditor/documentBuilder/documentTree";
import Unknown from "./elementsPreview/Unknown";
import Basic from "./elementsPreview/Basic";
import Image from "./elementsPreview/Image";
import Container from "./elementsPreview/Container";
import Card from "./elementsPreview/Card";
import { produce } from "immer";
import Pipeline from "./elementsPreview/Pipeline";
import Button from "./elementsPreview/Button";
import List from "./elementsPreview/List";

// Bookkeeping trace paths for preview is not necessary. But, we need to provide a value for the previews that use
// getComponentDefinition under the hood
const DUMMY_TRACE_PATH: DynamicPath = { staticId: "preview", branches: [] };

const allowedBootstrapPrefixes = ["text", "bg"];
function filterCssClassesForPreview(props: UnknownObject | undefined): void {
  // Never hide elements in the preview
  delete props.hidden;

  if (typeof props?.className === "string") {
    props.className = props.className
      .split(" ")
      .filter((x) =>
        allowedBootstrapPrefixes.some((prefix) => x.startsWith(prefix)),
      )
      .join(" ");
  }
}

function getPreviewComponentDefinition(
  documentBuilderElement: DocumentBuilderElement,
): DocumentBuilderComponent {
  const previewElement = produce(documentBuilderElement, (draft) => {
    // Don't hide elements in the preview
    delete draft.config.hidden;
  });

  const componentType = String(previewElement.type);
  const config = get(previewElement, "config", {} as UnknownObject);

  switch (componentType) {
    case "header_1":
    case "header_2":
    case "header_3":
    case "header":
    case "text": {
      const documentBuilderComponent = getDocumentBuilderComponent(
        previewElement,
        DUMMY_TRACE_PATH,
      );

      filterCssClassesForPreview(documentBuilderComponent.props);

      return {
        Component: Basic,
        props: {
          elementType: previewElement.type,
          documentBuilderComponent,
        },
      };
    }

    case "image": {
      const documentBuilderComponent = getDocumentBuilderComponent(
        previewElement,
        DUMMY_TRACE_PATH,
      );
      filterCssClassesForPreview(documentBuilderComponent.props);

      return {
        Component: Image,
        props: {
          elementType: previewElement.type,
          documentBuilderComponent,
        },
      };
    }

    case "container":
    case "row":
    case "column": {
      const documentBuilderComponent = getDocumentBuilderComponent(
        previewElement,
        DUMMY_TRACE_PATH,
      );
      filterCssClassesForPreview(documentBuilderComponent.props);

      return {
        Component: Container,
        props: {
          element: previewElement,
          documentBuilderComponent,
        },
      };
    }

    case "card": {
      const cardPreviewElement = produce(previewElement, (draft) => {
        draft.config.bodyClassName = documentTreeStyles.container;
      });

      const documentBuilderComponent = getDocumentBuilderComponent(
        cardPreviewElement,
        DUMMY_TRACE_PATH,
      );
      filterCssClassesForPreview(documentBuilderComponent.props);

      return {
        Component: Card,
        props: {
          element: previewElement,
          documentBuilderComponent,
        },
      };
    }

    case "pipeline": {
      return {
        Component: Pipeline,
        props: {
          element: previewElement,
        },
      };
    }

    case "button": {
      const buttonProps = {
        ...(config as ButtonElementConfig),
      };
      filterCssClassesForPreview(buttonProps);
      const {
        props: { children, tooltip },
      } = getDocumentBuilderComponent(previewElement, DUMMY_TRACE_PATH);

      return {
        Component: Button,
        props: {
          element: previewElement,
          buttonProps,
          children,
          title: tooltip,
        },
      };
    }

    case "list": {
      return { Component: List, props: { element: previewElement } };
    }

    default: {
      const documentBuilderComponent = getDocumentBuilderComponent(
        documentBuilderElement,
        DUMMY_TRACE_PATH,
      );
      filterCssClassesForPreview(documentBuilderComponent.props);

      return {
        Component: Unknown,
        props: {
          documentBuilderComponent,
        },
      };
    }
  }
}

export default getPreviewComponentDefinition;
