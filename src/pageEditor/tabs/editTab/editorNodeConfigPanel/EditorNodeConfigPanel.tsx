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

import styles from "./EditorNodeConfigPanel.module.scss";

import React, { useEffect, useMemo } from "react";
import { Col, Row } from "react-bootstrap";
import { RegistryId, UUID } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import BlockConfiguration from "@/pageEditor/tabs/effect/BlockConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { showOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import getType from "@/runtime/getType";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveNodeError } from "@/pageEditor/slices/editorSelectors";
import PopoverOutputLabel from "./PopoverOutputLabel";
import { setNestedObjectValues, useField } from "formik";
import useDebouncedEffect from "@/pageEditor/hooks/useDebouncedEffect";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { isEqual } from "lodash";

const EditorNodeConfigPanel: React.FC<{
  /**
   * The block field name in the form
   * @see BlockConfig
   */
  blockFieldName: string;
  blockId: RegistryId;
  nodeId: UUID;
}> = ({ blockFieldName, blockId, nodeId }) => {
  const [blockInfo] = useAsyncState(async () => {
    const block = await blockRegistry.lookup(blockId);
    return {
      block,
      type: await getType(block),
    };
  }, [blockId]);

  const dispatch = useDispatch();
  const nodeError = useSelector(selectActiveNodeError);
  const [, { error }, { setError, setTouched }] = useField(blockFieldName);
  useDebouncedEffect(
    error,
    () => {
      if (!isEqual(nodeError?.fieldErrors, error)) {
        console.log("setting error in Redux", {
          blockFieldName,
          reduxError: nodeError?.fieldErrors,
          formikError: error,
        });

        dispatch(
          editorActions.setError({
            fieldErrors: error,
          })
        );
      }
    },
    500
  );

  useEffect(() => {
    // FIXME: don't use setTimeout here
    // Formik seems to erase the error set on mount, so we wait a bit
    // Figure out what's going on an fix it
    setTimeout(() => {
      if (
        nodeError?.fieldErrors != null &&
        !isEqual(nodeError.fieldErrors, error)
      ) {
        console.log("setting error in Formik with timeout", {
          blockFieldName,
          nodeError: nodeError.fieldErrors,
        });
        setError(nodeError.fieldErrors as any);
        setTouched(setNestedObjectValues(nodeError.fieldErrors, true), false);
      }
    }, 1000);
  }, [nodeId]);

  console.log("NodeConfigPanel", {
    blockFieldName,
    formikError: error,
    nodeError,
  });

  const isOutputDisabled = !(
    blockInfo === null || showOutputKey(blockInfo?.type)
  );
  const outputDescription = isOutputDisabled
    ? "Effect and renderer bricks do not produce outputs"
    : "Provide an output key to refer to the outputs of this block later.";

  const outputKeyLabel = useMemo(
    () => <PopoverOutputLabel description={outputDescription} />,
    [outputDescription]
  );

  const newBlockError = useSelector(selectActiveNodeError);
  const blockError =
    newBlockError?.nodeErrors == null
      ? null
      : Object.values(newBlockError.nodeErrors).filter(Boolean).join(" ");

  return (
    <>
      {blockError && (
        <Row>
          <Col className="text-danger">{blockError}</Col>
        </Row>
      )}
      <Row className={styles.topRow}>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.label`}
            label="Step Name"
            fitLabelWidth
            placeholder={blockInfo?.block.name}
          />
        </Col>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.outputKey`}
            label={outputKeyLabel}
            fitLabelWidth
            disabled={isOutputDisabled}
            as={KeyNameWidget}
          />
        </Col>
      </Row>

      <BlockConfiguration name={blockFieldName} blockId={blockId} />
    </>
  );
};

export default EditorNodeConfigPanel;
