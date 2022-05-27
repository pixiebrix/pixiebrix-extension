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
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./TagList.module.scss";
import cx from "classnames";

export type TagItem = {
  tag: string;
  icon?: IconProp;
};

const TagList: React.VFC<{
  tagItems: TagItem[];
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
}> = ({ tagItems, activeTag, onSelectTag }) => (
  <div className={styles.root}>
    {tagItems.map((item) => (
      <button
        className={cx(styles.item, {
          [styles.itemActive]: activeTag === item.tag,
        })}
        key={item.tag}
        onClick={() => {
          if (activeTag !== item.tag) {
            onSelectTag(item.tag);
          }
        }}
      >
        {item.icon && (
          <span className={styles.iconContainer}>
            <FontAwesomeIcon icon={item.icon} />
          </span>
        )}
        {item.tag}
      </button>
    ))}
  </div>
);

export default TagList;
