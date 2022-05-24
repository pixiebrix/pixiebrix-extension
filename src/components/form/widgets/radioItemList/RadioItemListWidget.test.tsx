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
import { RadioItem } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import { render } from "@/pageEditor/testHelpers";
import RadioItemListWidget from "@/components/form/widgets/radioItemList/RadioItemListWidget";

const sampleItems: RadioItem[] = [
  {
    label: "This is the label for Option One in the radio items",
    value: "option1",
  },
  {
    label: "This is the label for Option Two in the radio items",
    value: "option2",
  },
  {
    label: "This is the label for Option Three in the radio items",
    value: "option3",
  },
];

const sampleHeader = "This is a test header for radio item select";

const fieldName = "testField";

describe("RadioItemListWidget", () => {
  test("it renders", () => {
    expect(
      render(
        <RadioItemListWidget
          name={fieldName}
          items={sampleItems}
          header={sampleHeader}
        />,
        {
          initialValues: {
            [fieldName]: "option1",
          },
        }
      ).asFragment()
    ).toMatchSnapshot();
  });
});
