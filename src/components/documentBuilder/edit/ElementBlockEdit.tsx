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
import { reportEvent } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { selectActiveElementId } from "@/pageEditor/slices/editorSelectors";
import { BlockType } from "@/runtime/runtimeTypes";

type ElementBlockEditProps = {
  blockTypes: BlockType[];
  blockConfigName: string;
  blockConfig: BlockConfig;
  onBlockSelected: (blockConfig: BlockConfig) => void;
};

const ElementBlockEdit: React.FC<ElementBlockEditProps> = ({
  blockTypes,
  blockConfigName,
  blockConfig,
  onBlockSelected,
}) => {
  const sessionId = useSelector(selectSessionId);
  const elementId = useSelector(selectActiveElementId);

  const [renderBlocks] = useAsyncState<IBlock[]>(
    async () => {
      const allBlocks = await blockRegistry.allTyped();
      return [...allBlocks.values()]
        .filter((x) => blockTypes.includes(x.type))
        .map((x) => x.block);
    },
    [],
    []
  );

  const blockId = blockConfig.id;
  const [, BlockOptions] = useBlockOptions(blockId);

  const onPipelineBlockSelected = (block: IBlock) => {
    const blockConfig: BlockConfig = {
      id: block.id,
      instanceId: uuidv4(),
      config: defaultBlockConfig(block.inputSchema),
    };

    reportEvent("BrickAdd", {
      brickId: block.id,
      sessionId,
      elementId,
      source: "PageEditor-DocumentBuilder",
    });
    onBlockSelected(blockConfig);
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

export default ElementBlockEdit;
