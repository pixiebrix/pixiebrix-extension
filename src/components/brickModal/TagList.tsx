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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./TagList.module.scss";
import cx from "classnames";
import { useAsyncIcon } from "@/components/AsyncIcon";
import { IconStringDefinition } from "@/types/contract";
import { faTag } from "@fortawesome/free-solid-svg-icons";

export type TagItem = {
  tag: string;
  icon?: IconStringDefinition;
};

const TagListItem: React.VFC<{
  item: TagItem;
  isActive: boolean;
  onSelect: () => void;
}> = ({ item, isActive, onSelect }) => {
  const icon = useAsyncIcon(item.icon, faTag);

  return (
    <button
      className={cx(styles.item, {
        [styles.itemActive]: isActive,
      })}
      onClick={() => {
        onSelect();
      }}
    >
      {icon && (
        <>
          <FontAwesomeIcon icon={icon} fixedWidth />{" "}
        </>
      )}
      {item.tag}
    </button>
  );
};

const TagList: React.VFC<{
  tagItems: TagItem[];
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
}> = ({ tagItems, activeTag, onSelectTag }) => (
  <div className={styles.root}>
    {tagItems.map((item) => (
      <TagListItem
        key={item.tag}
        item={item}
        isActive={activeTag === item.tag}
        onSelect={() => {
          if (activeTag !== item.tag) {
            onSelectTag(item.tag);
          }
        }}
      />
    ))}
  </div>
);

export default TagList;
