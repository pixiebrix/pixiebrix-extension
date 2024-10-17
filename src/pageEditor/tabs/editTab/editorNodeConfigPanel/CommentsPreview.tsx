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

import { Alert, Button } from "react-bootstrap";
import React from "react";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStickyNote } from "@fortawesome/free-regular-svg-icons";
import styles from "./CommentsPreview.module.scss";
import { useDispatch } from "react-redux";
import { actions } from "@/pageEditor/store/editor/editorSlice";

const CommentsPreview: React.FunctionComponent<{
  comments: string;
}> = ({ comments }) => {
  const dispatch = useDispatch();
  const [, selectTab] = useDataPanelActiveTabKey(DataPanelTabKey.Comments);

  const handleClick = () => {
    selectTab(DataPanelTabKey.Comments);
    dispatch(
      actions.setDataPanelExpanded({
        isExpanded: true,
      }),
    );
  };

  return (
    <Alert role="note" className={styles.root}>
      <FontAwesomeIcon icon={faStickyNote} className={styles.icon} />
      <p className={styles.text}>{comments}</p>
      <Button
        variant="link"
        size="sm"
        className="text-uppercase flex-shrink-0 py-0"
        onClick={handleClick}
      >
        View Brick Comments
      </Button>
    </Alert>
  );
};

export default CommentsPreview;
