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

// Required for react-select-virtualized https://github.com/guiyep/react-select-virtualized/issues/283
import "regenerator-runtime/runtime";

import React, { useMemo } from "react";
import { IconOption } from "@/icons/types";
import { icons } from "@/icons/list";
import Icon from "./Icon";
import { IconLibrary } from "@/core";
import { sortBy } from "lodash";
import {
  ComboBox,
  Item,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";

const iconOptions: IconOption[] = sortBy(
  [...icons].flatMap(([library, libraryCache]) =>
    [...libraryCache].map(([id]) => ({
      value: { library, id },
      label: id,
      key: JSON.stringify({ library, id }),
    }))
  ),
  (x) => x.label
);

interface OwnProps {
  value: { id: string; library: IconLibrary };
  isClearable?: boolean;
  onChange: (option: IconOption | null) => void;
}

const IconSelector: React.FunctionComponent<OwnProps> = ({
  value,
  onChange,
}) => {
  const selectedOption = useMemo(() => {
    if (value) {
      return iconOptions.find(
        (x) => x.value.library === value.library && x.value.id === value.id
      );
    }

    return null;
  }, [value]);

  return (
    <SpectrumProvider theme={defaultTheme} colorScheme="light">
      <ComboBox defaultItems={iconOptions}>
        {(item) => (
          <Item aria-label={item.value.id} textValue={item.value.id}>
            <Icon icon={item.value.id} size={32} library={item.value.library} />
          </Item>
        )}
      </ComboBox>
    </SpectrumProvider>
  );
};

export default IconSelector;
