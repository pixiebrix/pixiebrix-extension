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
import { type BrickConfig } from "@/bricks/types";
import styles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
// TODO import TextAreaWidget from "@/components/formBuilder/TextAreaWidget";

const CommentsTab: React.FunctionComponent<{
  comments?: BrickConfig["comments"];
}> = ({ comments }) => (
  <Tab.Pane eventKey={DataPanelTabKey.Comments} className={styles.tabPane}>
    <textarea
      className="form-control"
      style={{ whiteSpace: "pre-wrap" }}
      value={comments}
      placeholder="No comments available"
    />
    {/* <TextAreaWidget/> */}
  </Tab.Pane>
);

export default CommentsTab;
