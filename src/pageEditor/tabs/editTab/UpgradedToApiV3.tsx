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

import styles from "./UpgradedToApiV3.module.scss";

import React from "react";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationCircle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import { selectShowV3UpgradeMessageForActiveElement } from "@/pageEditor/slices/editorSelectors";
import { RootState } from "@/pageEditor/pageEditorTypes";

const UpgradedToApiV3: React.FC = () => {
  const showMessage = useSelector<RootState, boolean>(
    selectShowV3UpgradeMessageForActiveElement
  );
  const dispatch = useDispatch();

  return (
    showMessage && (
      <Alert variant="info" className={styles.alert}>
        <FontAwesomeIcon
          icon={faExclamationCircle}
          size="lg"
          className="mt-1"
        />
        <p>
          The Page Editor no longer supports editing bricks created for runtime
          API v2. We&apos;ve attempted to automatically convert this extension
          to runtime API v3.{" "}
          <a
            href="https://docs.pixiebrix.com/runtime"
            target="_blank"
            rel="noreferrer"
          >
            Read more about this change here.
          </a>
        </p>
        <button
          type="button"
          className={styles.close}
          onClick={() => {
            dispatch(actions.hideV3UpgradeMessage());
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </Alert>
    )
  );
};

export default UpgradedToApiV3;
