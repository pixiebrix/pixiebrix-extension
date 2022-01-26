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
import { ComponentMeta, ComponentStory } from "@storybook/react";
import CreatableAutosuggest from "@/devTools/editor/fields/creatableAutosuggest/CreatableAutosuggest";
import {
  faHandPeace,
  faHandshake,
  faPrayingHands,
  faStar,
  faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default {
  title: "Fields/CreatableAutosuggest",
  component: CreatableAutosuggest,
} as ComponentMeta<typeof CreatableAutosuggest>;

const Story: ComponentStory<typeof CreatableAutosuggest> = (args) => (
  <div style={{ height: 200 }}>
    <CreatableAutosuggest {...args} />
  </div>
);

interface Suggestion {
  icon: IconDefinition;
  value: string;
}

const suggestions = [
  { icon: faThumbsUp, value: "Foo" },
  { icon: faHandPeace, value: "Bar" },
  { icon: faPrayingHands, value: "Baz" },
  { icon: faHandshake, value: "Qux" },
];

const getNewSuggestion = (value: string) => ({ icon: faStar, value });

function render(value: string, icon?: IconDefinition) {
  return (
    <>
      <span>{value} </span>
      {icon && <FontAwesomeIcon icon={icon} color="red" />}
    </>
  );
}

const renderSuggestion = ({ icon, value }: Suggestion) => render(value, icon);

const renderCreateNew = (value: string) => render(value);

const baseArgs = {
  isClearable: true,
  isDisabled: false,
  suggestions,
  renderSuggestion,
  onCreateNew: getNewSuggestion,
};

export const Default = Story.bind({});
Default.args = {
  ...baseArgs,
  inputPlaceholder: "Choose from Default...",
};

export const InitialValue = Story.bind({});
InitialValue.args = {
  ...baseArgs,
  inputValue: suggestions[0].value,
  inputPlaceholder: "Choose after InitialValue cleared...",
};

export const NotClearable = Story.bind({});
NotClearable.args = {
  ...baseArgs,
  isClearable: false,
  inputPlaceholder: "Choose with no clearing...",
};

export const Disabled = Story.bind({});
Disabled.args = {
  ...baseArgs,
  isDisabled: true,
  inputPlaceholder: "You cannot choose from a disabled autosuggest",
};

export const Creatable = Story.bind({});
Creatable.args = {
  ...baseArgs,
  renderCreateNew,
  inputPlaceholder: "Choose an option or create new item...",
};
