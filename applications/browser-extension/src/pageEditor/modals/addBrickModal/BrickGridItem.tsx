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

import React from "react";
import { Button } from "react-bootstrap";
import PackageIcon from "../../../components/PackageIcon";
import styles from "./BrickGridItem.module.scss";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Icon from "../../../icons/Icon";
import { type BrickSearchResult } from "./addBrickModalTypes";
import cx from "classnames";
import Alert from "../../../components/Alert";
import ClickableElement from "../../../components/ClickableElement";

export const BRICK_ITEM_FIXED_HEIGHT_PX = 89;

type BrickItemProps = {
  brick: BrickSearchResult;
  onSelect: () => void;
  onShowDetail: () => void;
  invalidMessage?: React.ReactNode;
};

const BrickGridItem: React.VFC<BrickItemProps> = ({
  brick,
  onSelect,
  onShowDetail,
  invalidMessage,
}) => (
  <ClickableElement onClick={onShowDetail} className={styles.root}>
    <div
      className={cx(styles.content, {
        [styles.invalid ?? ""]: Boolean(invalidMessage),
      })}
    >
      <div className={styles.nameRow}>
        <PackageIcon packageOrMetadata={brick} faIconClass={styles.icon} />
        <span className={styles.name}>{brick.name}</span>
        {brick.isPopular && (
          <Icon
            icon="icon-sparkles"
            library="custom"
            className={styles.popularIcon}
          />
        )}
      </div>
      {brick.description ? (
        <div className={styles.description}>{brick.description}</div>
      ) : (
        <small className="text-muted font-italic">
          No description provided.
        </small>
      )}
    </div>

    <Button
      variant="primary"
      onClick={() => {
        onSelect();
      }}
      className={styles.addButton}
    >
      <FontAwesomeIcon icon={faPlus} /> Add
    </Button>

    {invalidMessage && (
      <Alert variant="warning" className={styles.invalidAlert}>
        {invalidMessage}
      </Alert>
    )}
  </ClickableElement>
);

export default BrickGridItem;
