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
import { BlockConfig } from "@/blocks/types";
import useBlockOptions from "@/hooks/useBlockOptions";
import { Col, Row } from "react-bootstrap";
import BrickModal from "@/components/brickModal/BrickModal";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { defaultBlockConfig } from "@/blocks/util";
import { IBlock } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { produce } from "immer";
import { PipelineDocumentElement } from "@/components/documentBuilder/documentBuilderTypes";

type ElementButtonEditProps = {
  elementName: string;
  element: PipelineDocumentElement;
  setElement: (
    value: PipelineDocumentElement,
    shouldValidate?: boolean
  ) => void;
};

const ElementButtonEdit: React.FC<ElementButtonEditProps> = ({
  elementName,
  element,
  setElement,
}) => {
  const [renderBlocks] = useAsyncState<IBlock[]>(
    async () => {
      const allBlocks = await blockRegistry.allTyped();
      return Object.values(allBlocks)
        .filter((x) => x.type === "renderer")
        .map((x) => x.block);
    },
    [],
    []
  );

  const blockConfig = element.config.pipeline.__value__[0];
  const blockConfigName = `${elementName}.config.pipeline.__value__.0`;
  const blockId = blockConfig.id;
  const [, BlockOptions] = useBlockOptions(blockId);

  const onPipelineBlockSelected = (block: IBlock) => {
    const blockConfig: BlockConfig = {
      id: block.id,
      instanceId: uuidv4(),
      config: defaultBlockConfig(block.inputSchema),
    };

    const nextDocumentElement = produce(
      element,
      (draft: PipelineDocumentElement) => {
        draft.config.pipeline.__value__ = [blockConfig];
      }
    );

    setElement(nextDocumentElement);
  };

  return (
    <>
      <Row>
        <Col>
          <BrickModal
            bricks={renderBlocks}
            onSelect={onPipelineBlockSelected}
          />
        </Col>
        <Col>{blockId}</Col>
      </Row>
      {BlockOptions && (
        <BlockOptions name={blockConfigName} configKey={"config"} />
      )}
    </>
  );
};

export default ElementButtonEdit;
