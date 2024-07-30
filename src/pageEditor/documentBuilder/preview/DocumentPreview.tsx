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

import previewStyles from "./ElementPreview.module.scss";
import documentTreeStyles from "@/pageEditor/documentBuilder/preview/documentTree.module.scss";
import styles from "./DocumentPreview.module.scss";
import { useField } from "formik";
import React, {
  type MouseEventHandler,
  type MutableRefObject,
  useMemo,
  useState,
} from "react";
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import AddElementAction from "./AddElementAction";
import ElementPreview from "./ElementPreview";
import { ROOT_ELEMENT_TYPES } from "@/pageEditor/documentBuilder/allowedElementTypes";
import cx from "classnames";
import { getPreviewValues } from "@/components/fields/fieldUtils";
import useDocumentPreviewRunBlock from "@/pageEditor/tabs/effect/useDocumentPreviewRunBlock";
import { useSelector } from "react-redux";
import {
  selectActiveNodeId,
  selectParentNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import Alert from "@/components/Alert";
import { getErrorMessage } from "@/errors/errorHelpers";
import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import { selectActiveModComponentTraceForBrick } from "@/pageEditor/store/runtime/runtimeSelectors";
import ClickableElement from "@/components/ClickableElement";
import { assertNotNullish } from "@/utils/nullishUtils";

type DocumentPreviewProps = {
  /**
   * Formik field name for the document body prop.
   */
  documentBodyName: string;
  /**
   * The active builder element, or null if no element is selected.
   */
  activeElement: string | null;
  /**
   * Set or clear the active builder element.
   */
  setActiveElement: (activeElement: string | null) => void;
  /**
   * Optional boundary for popover menu position calculations.
   * @see EllipsisMenu
   */
  boundingBoxRef?: MutableRefObject<HTMLElement | null>;
};

const DocumentPreview = ({
  documentBodyName,
  activeElement,
  setActiveElement,
  boundingBoxRef,
}: DocumentPreviewProps) => {
  const [{ value: body }] =
    useField<DocumentBuilderElement[]>(documentBodyName);

  const bodyPreview = useMemo(() => getPreviewValues(body), [body]);

  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const isHovered = hoveredElement === "body";

  const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    setActiveElement(null);
  };

  const onMouseOver: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    setHoveredElement("body");
  };

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    setHoveredElement(null);
  };

  const activeNodeId = useSelector(selectActiveNodeId);

  assertNotNullish(
    activeNodeId,
    "DocumentPreview can only be used in an brick editing context",
  );

  const parentNodeInfo = useSelector(selectParentNodeInfo(activeNodeId));
  const showPreviewButton =
    parentNodeInfo?.blockId === DisplayTemporaryInfo.BRICK_ID;

  const {
    error: previewError,
    isRunning: isPreviewRunning,
    runBlockPreview,
  } = useDocumentPreviewRunBlock(activeNodeId);

  const traceRecord = useSelector(
    selectActiveModComponentTraceForBrick(activeNodeId),
  );
  const doesNotHaveTrace = traceRecord == null;

  return (
    <>
      {showPreviewButton && (
        <>
          {doesNotHaveTrace && (
            <Alert variant="info" className="mb-2">
              No runs available. Run the brick to enable Live Preview
            </Alert>
          )}
          {previewError && (
            <Alert variant="danger" className="mb-2">
              {getErrorMessage(previewError)}
            </Alert>
          )}
          <Button
            variant="info"
            size="sm"
            disabled={isPreviewRunning || doesNotHaveTrace}
            onClick={runBlockPreview}
          >
            Show Live Preview <FontAwesomeIcon icon={faExternalLinkAlt} />
          </Button>
          <hr />
        </>
      )}
      <ClickableElement
        onClick={onClick}
        className={cx(
          styles.root,
          previewStyles.root,
          documentTreeStyles.container,
          {
            [previewStyles.hovered ?? ""]: isHovered,
            [styles.empty ?? ""]: body.length === 0,
          },
        )}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {bodyPreview.map((childElement, childIndex) => (
          <ElementPreview
            // eslint-disable-next-line react/no-array-index-key -- They have no other unique identifier
            key={`${documentBodyName}.${childIndex}`}
            documentBodyName={documentBodyName}
            elementName={String(childIndex)}
            previewElement={childElement}
            activeElement={activeElement}
            setActiveElement={setActiveElement}
            boundingBoxRef={boundingBoxRef}
            hoveredElement={hoveredElement}
            setHoveredElement={setHoveredElement}
          />
        ))}
        {body.length === 0 && <span className="text-muted">body</span>}
        <AddElementAction
          elementsCollectionName={documentBodyName}
          allowedTypes={ROOT_ELEMENT_TYPES}
          className={previewStyles.addElement}
          boundingBoxRef={boundingBoxRef}
        />
      </ClickableElement>
    </>
  );
};

export default DocumentPreview;
