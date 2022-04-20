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

import React, { useState } from "react";
import { RadioItemListProps } from "@/components/radioItemList/radioItemListTypes";
import { isEmpty, isEqual, uniqBy } from "lodash";
import styles from "./RadioItemList.module.scss";

const RadioItemList: React.FC<RadioItemListProps> = ({
  items,
  onSelectItem,
  defaultSelectedItemId,
}) => {
  if (isEmpty(items)) {
    throw new Error("No items received for RadioItemList");
  }

  const uqItems = uniqBy(items, (item) => item.id);
  if (uqItems.length !== items.length) {
    throw new Error("RadioItemList items have duplicate ids");
  }

  const defaultItem = items.find((item) => item.id === defaultSelectedItemId);
  if (defaultItem == null) {
    throw new Error("Invalid defaultSelectedItemId");
  }

  const [selectedItem, setSelectedItem] = useState(defaultItem);

  return (
    <form className={styles.root}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <label className={styles.label}>
            <input
              type="radio"
              name="radio-item-list"
              className={styles.input}
              value={item.id}
              checked={isEqual(item, selectedItem)}
              onChange={() => {
                setSelectedItem(item);
                onSelectItem(item);
              }}
            />
            {item.label ?? item.id}
          </label>
        </div>
      ))}
    </form>
  );
};

export default RadioItemList;
