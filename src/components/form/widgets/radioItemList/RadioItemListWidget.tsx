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
import { RadioItemListWidgetProps } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import { isEmpty, uniqBy } from "lodash";
import styles from "./RadioItemListWidget.module.scss";
import { useField } from "formik";

const RadioItemListWidget: React.FC<RadioItemListWidgetProps> = ({
  name,
  items,
  header,
}) => {
  if (isEmpty(items)) {
    throw new Error("No items received for RadioItemList");
  }

  const uqItems = uniqBy(items, (item) => item.value);
  if (uqItems.length !== items.length) {
    throw new Error("RadioItemList items have duplicate ids");
  }

  const [{ value }, , { setValue }] = useField<string>(name);

  return (
    <>
      {header && <h6>{header}</h6>}
      <form className={styles.root}>
        {items.map((item) => (
          <div key={item.value} className={styles.item}>
            <label className={styles.label}>
              <input
                type="radio"
                name="radio-item-list"
                className={styles.input}
                value={item.value}
                checked={item.value === value}
                onChange={() => {
                  setValue(item.value);
                }}
              />
              {item.label}
            </label>
          </div>
        ))}
      </form>
    </>
  );
};

export default RadioItemListWidget;
