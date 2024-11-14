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
import { ButtonGroup, ButtonToolbar } from "react-bootstrap";
import styles from "@/components/richTextEditor/toolbar/Toolbar.module.scss";
import HeadingLevelDropdown from "@/components/richTextEditor/toolbar/HeadingLevelDropdown";
import BoldButton from "@/components/richTextEditor/toolbar/BoldButton";
import ItalicButton from "@/components/richTextEditor/toolbar/ItalicButton";
// Required for font-awesome styles to be available in IsolatedComponents
import "@fortawesome/fontawesome-svg-core/styles.css";
import LinkButton from "@/components/richTextEditor/toolbar/LinkButton";
import ToolbarOverflow from "@/components/richTextEditor/toolbar/ToolbarOverflow";
import ImageButton from "@/components/richTextEditor/toolbar/ImageButton"

const Toolbar: React.FunctionComponent = () => (
  <ButtonToolbar
    className={styles.toolbar}
    aria-label="Rich-Text Editor Toolbar"
  >
    <HeadingLevelDropdown />
    <ButtonGroup size="sm">
      <BoldButton />
      <ItalicButton />
      <LinkButton />
      <ImageButton />
    </ButtonGroup>

    <ButtonGroup size="sm">
      <ToolbarOverflow />
    </ButtonGroup>
  </ButtonToolbar>
);

export default Toolbar;
