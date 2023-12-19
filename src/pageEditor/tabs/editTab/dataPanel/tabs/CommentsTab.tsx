/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { Tab } from "react-bootstrap";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import styles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { Events } from "@/telemetry/events";
import reportEvent from "@/telemetry/reportEvent";

const CommentsTab: React.FunctionComponent<{
  brickCommentsFieldName: string;
}> = ({ brickCommentsFieldName }) => {
  // TODO: add mod id and brick id to telemetry
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const comments = event.target.value;
    reportEvent(Events.BRICK_COMMENTS_UPDATE, {
      commentsLength: comments.length,
    });
  };

  return (
    <Tab.Pane
      eventKey={DataPanelTabKey.Comments}
      className={styles.tabPane}
      data-testid="comments-tab-pane"
    >
      <TextWidget
        name={brickCommentsFieldName}
        schema={{ type: "string" }}
        data-testid={`comments-text-area-${brickCommentsFieldName}`}
        onBlur={handleBlur}
      />
    </Tab.Pane>
  );
};

export default CommentsTab;
