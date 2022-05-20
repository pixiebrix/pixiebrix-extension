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
import EditorTabLayout, {
  ActionButton,
  TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import {
  faHistory,
  faQuestionCircle,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { render } from "@/testUtils/testHelpers";

function getTabItem(name: string, badgeCount?: number): TabItem {
  if (badgeCount) {
    return {
      name,
      TabContent: () => (
        <div>
          <h1>Sample ${name} Tab</h1>
          <p>This is a sample tab with some text content</p>
        </div>
      ),
      badgeCount,
      badgeVariant: "danger",
    };
  }

  return {
    name,
    TabContent: () => (
      <div>
        <h1>Sample ${name} Tab</h1>
        <p>This is a sample tab with some text content</p>
      </div>
    ),
  };
}

const sampleTabItems: TabItem[] = [
  getTabItem("Edit"),
  getTabItem("Options"),
  getTabItem("Logs", 3),
];

const sampleButtons: ActionButton[] = [
  {
    variant: "info",
    onClick: jest.fn(),
    caption: "Ask a question",
    icon: faQuestionCircle,
  },
  {
    variant: "primary",
    onClick: jest.fn(),
    caption: "Save",
    icon: faSave,
  },
  {
    variant: "warning",
    onClick: jest.fn(),
    caption: "Reset",
    disabled: true,
    icon: faHistory,
  },
  {
    variant: "danger",
    onClick: jest.fn(),
    caption: "Remove",
    icon: faTrash,
  },
];

describe("EditorTabLayout", () => {
  test("it renders", () => {
    expect(
      render(
        <EditorTabLayout tabs={sampleTabItems} actionButtons={sampleButtons} />
      ).asFragment()
    ).toMatchSnapshot();
  });
});
