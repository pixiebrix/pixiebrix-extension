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
import { type ComponentMeta, type Story } from "@storybook/react";
import VariablesTree from "./VariablesTree";

export default {
  title: "PageEditor/VariablesTree",
  component: VariablesTree,
} as ComponentMeta<typeof VariablesTree>;

// Empty objects in the tree correspond to the ExistenceMap leaf
const knownVars: any = {
  "root:Array Composite Reader": {
    "@input": {
      description: {},
      icon: {},
      image: {},
      keywords: {},
      title: {},
      type: {},
      url: {},
      props: {
        markdown: {},
      },
    },
  },
  trace: {
    "@input": {
      icon: {},
      title: {},
      language: {},
      url: {},
      provider: {},
    },
    "@data": {
      foo: {},
      "hello world": {},
    },
    "@ifElseOutput": {
      props: {
        markdown: {},
      },
    },
  },
  "extension.blockPipeline.0": {
    "@data": {},
  },
  "extension.blockPipeline.1": {
    "@ifElseOutput": {},
  },
  "extension.blockPipeline.2": {
    "@forEachOutput": {},
  },
};

const Template: Story<typeof VariablesTree> = () => {
  const vars = knownVars["root:Array Composite Reader"];
  return <VariablesTree vars={vars} />;
};

export const Default = Template.bind({});
