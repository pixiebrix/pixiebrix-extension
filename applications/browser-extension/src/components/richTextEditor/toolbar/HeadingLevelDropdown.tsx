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
import { useCurrentEditor } from "@tiptap/react";
import Select from "react-select";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { type Level } from "@tiptap/extension-heading";

const headingLevels: Level[] = [1, 2, 3, 4, 5, 6];
const options: Array<Option<0 | Level>> = [
  { label: "Paragraph", value: 0 },
  ...headingLevels.map((level) => ({
    label: `Heading ${level}`,
    value: level,
  })),
];

const HeadingLevelDropdown: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  const handleChange = (option: Option<0 | Level> | null) => {
    if (!option) {
      return;
    }

    const level = option.value;

    if (level === 0) {
      editor.chain().focus().setParagraph().run();
      return;
    }

    editor.chain().focus().setHeading({ level }).run();
  };

  const currentLevelOption = options.find(
    (option) => option.value === (editor.getAttributes("heading").level ?? 0),
  );

  return (
    <Select
      options={options}
      aria-label="Heading Level"
      value={currentLevelOption}
      onChange={handleChange}
      maxMenuHeight={100}
      classNamePrefix="heading-level"
    />
  );
};

export default HeadingLevelDropdown;
