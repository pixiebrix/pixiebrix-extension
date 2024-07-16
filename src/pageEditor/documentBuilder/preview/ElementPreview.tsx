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

import React, { type MouseEventHandler, useEffect, useMemo } from "react";
import styles from "./ElementPreview.module.scss";
import cx from "classnames";
import {
  type DocumentBuilderElement,
  isButtonElement,
  isListElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import AddElementAction from "./AddElementAction";
import { getAllowedChildTypes } from "@/pageEditor/documentBuilder/allowedElementTypes";
import getPreviewComponentDefinition from "./getPreviewComponentDefinition";
import { SCROLL_TO_HEADER_NODE_EVENT } from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { selectActiveNodeId } from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";

export const SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT =
  "scroll-to-document-preview-element";

export type ElementPreviewProps = {
  /**
   * Formik name of the root element
   */
  documentBodyName: string;

  /**
   * The name of the element relative to the root element (i.e. "name" is not included)
   */
  elementName: string;
  // An element config having all expressions unwrapped, different from what is stored in Formik
  previewElement: DocumentBuilderElement;

  /**
   * The active element relative to the root element (i.e. "name" is not included)
   */
  activeElement: string | null;
  setActiveElement: (name: string | null) => void;
  hoveredElement: string | null;
  setHoveredElement: (name: string | null) => void;
  menuBoundary?: Element;
};

const useScrollIntoViewEffect = (elementName: string, isActive: boolean) => {
  const elementRef = React.useRef<Element>(null);

  useEffect(() => {
    if (!elementRef.current) {
      // This should never happen, because useEffect is called after the first render, by
      // which time the ref should be set.
      reportError(
        new Error(
          "Document Preview element ref is null, preventing scroll-to behavior.",
        ),
      );
      return;
    }

    const scrollIntoView = () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked above
      elementRef.current!.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };

    window.addEventListener(
      `${SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT}-${elementName}`,
      scrollIntoView,
    );

    if (isActive) {
      // Note: there is a Chrome bug where scrollIntoView cannot be called on elements simultaneously. This causes an
      // issue where the pipeline header node interrupts this scrollIntoView call in some cases (e.g. switching from one
      // mod component to another). For discussion and workaround, see:
      // https://stackoverflow.com/questions/49318497/google-chrome-simultaneously-smooth-scrollintoview-with-more-elements-doesn
      // Also see: PipelineHeaderNode.tsx
      scrollIntoView();
    }

    return () => {
      // Cleanup the event listener to avoid multiple listeners being added for the same event,
      // which would cause scrollIntoView to be called multiple times with out-of-date refs when the event is fired.
      window.removeEventListener(
        `${SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT}-${elementName}`,
        scrollIntoView,
      );
    };
  }, []);

  return elementRef;
};

const ElementPreview: React.FC<ElementPreviewProps> = ({
  documentBodyName,
  elementName,
  previewElement,
  activeElement,
  setActiveElement,
  hoveredElement,
  setHoveredElement,
  menuBoundary,
}) => {
  const dispatch = useDispatch();
  const activeNodeId = useSelector(selectActiveNodeId);
  const isActive = activeElement === elementName;
  const isHovered = hoveredElement === elementName && !isActive;
  const elementRef = useScrollIntoViewEffect(elementName, isActive);

  const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    event.preventDefault();

    if (!isActive) {
      setActiveElement(elementName);
    }

    assertNotNullish(activeNodeId, "activeNodeId is required to expand node");

    dispatch(actions.expandBrickPipelineNode(activeNodeId));

    window.dispatchEvent(
      new Event(`${SCROLL_TO_HEADER_NODE_EVENT}-${elementName}`),
    );
  };

  const onMouseOver: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    if (hoveredElement !== elementName) {
      setHoveredElement(elementName);
    }
  };

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    if (hoveredElement === elementName) {
      setHoveredElement(null);
    }
  };

  // Render children and Add Menu for the container element
  const isContainer = Array.isArray(previewElement.children);

  // Render the item template and the Item Type Selector for the list element
  const isList = isListElement(previewElement);

  // Have to apply to the wrapper PreviewComponent, because otherwise the button itself will expand to just the
  // size of the wrapper which would not be full width.
  // In the future, we could consider also inspecting className for `w-` and `btn-block` utility classes
  const isFullWidth =
    isButtonElement(previewElement) && previewElement.config.fullWidth;

  const { Component: PreviewComponent, props } = useMemo(
    () => getPreviewComponentDefinition(previewElement),
    [previewElement],
  );

  return (
    <PreviewComponent
      {...props}
      onClick={onClick}
      className={cx(styles.root, {
        [styles.active ?? ""]: isActive,
        [styles.hovered ?? ""]: isHovered,
        "btn-block": isFullWidth,
      })}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      documentBodyName={documentBodyName}
      elementName={elementName}
      isHovered={isHovered}
      isActive={isActive}
      elementRef={elementRef}
    >
      {props.children}
      {isContainer &&
        previewElement.children?.map((childElement, i) => {
          const childElementName = `${elementName}.children.${i}`;
          return (
            <ElementPreview
              key={childElementName}
              documentBodyName={documentBodyName}
              elementName={childElementName}
              previewElement={childElement}
              activeElement={activeElement}
              setActiveElement={setActiveElement}
              menuBoundary={menuBoundary}
              hoveredElement={hoveredElement}
              setHoveredElement={setHoveredElement}
            />
          );
        })}
      {isContainer && (
        <AddElementAction
          elementsCollectionName={`${documentBodyName}.${elementName}.children`}
          allowedTypes={getAllowedChildTypes(previewElement)}
          className={styles.addElement}
          menuBoundary={menuBoundary}
        />
      )}
      {isList && (
        <ElementPreview
          documentBodyName={documentBodyName}
          elementName={`${elementName}.config.element.__value__`}
          previewElement={previewElement.config.element.__value__}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          menuBoundary={menuBoundary}
          hoveredElement={hoveredElement}
          setHoveredElement={setHoveredElement}
        />
      )}
    </PreviewComponent>
  );
};

export default ElementPreview;
