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

import React, { useMemo } from "react";
import "./QuickAdd.scss";
import { IBlock } from "@/core";
import { useFormikContext } from "formik";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { Card } from "react-bootstrap";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import BlockIcon from "@/components/BlockIcon";

type Recommendation = {
  id: string;
};

const RECOMMENDED_BRICKS = new Map<ElementType, Recommendation[]>([
  [
    "menuItem",
    [
      { id: "@pixiebrix/browser/open-tab" },
      { id: "@pixiebrix/zapier/push-data" },
      { id: "@pixiebrix/forms/set" },
    ],
  ],
  [
    "trigger",
    [
      { id: "@pixiebrix/google/sheets-append" },
      { id: "@pixiebrix/highlight" },
      { id: "@pixiebrix/zapier/push-data" },
    ],
  ],
  [
    "contextMenu",
    [
      { id: "@pixiebrix/browser/open-tab" },
      { id: "@pixiebrix/zapier/push-data" },
      { id: "slack/simple-message" },
      { id: "@pixiebrix/google/sheets-append" },
    ],
  ],
  [
    "panel",
    [
      { id: "@pixiebrix/property-table" },
      { id: "@pixiebrix/iframe" },
      { id: "@pixiebrix/get" },
    ],
  ],
  [
    "actionPanel",
    [
      { id: "@pixiebrix/property-table" },
      { id: "@pixiebrix/iframe" },
      { id: "@pixiebrix/get" },
    ],
  ],
]);

const QuickAdd: React.FunctionComponent<{
  onSelect: (block: IBlock) => void;
  blocks: IBlock[];
}> = ({ blocks, onSelect }) => {
  const {
    values: { type },
  } = useFormikContext<FormState>();

  const recommendations = RECOMMENDED_BRICKS.get(type);

  const recommendedBlocks = useMemo(() => {
    const matched = (recommendations ?? []).map((recommendation) => ({
      recommendation,
      block: (blocks ?? []).find((x) => x.id === recommendation.id),
    }));
    return matched.filter((x) => x.block != null);
  }, [recommendations, blocks]);

  return (
    <div>
      <h4>Recommended Bricks</h4>
      <div className="RecommendationContainer">
        {recommendedBlocks.map(({ block }) => (
          <Card
            className="RecommendationCard"
            key={block.id}
            onClick={() => {
              onSelect(block);
            }}
          >
            <Card.Body className="text-center RecommendationCard__image">
              <div>
                <BlockIcon block={block} />
              </div>
            </Card.Body>
            <Card.Body>
              <Card.Title>{block.name}</Card.Title>
              <Card.Text className="small">{block.description}</Card.Text>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuickAdd;
