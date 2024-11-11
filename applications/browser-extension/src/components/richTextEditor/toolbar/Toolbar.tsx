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
import {
  ButtonGroup,
  ButtonToolbar,
  Button,
  Popover,
  OverlayTrigger,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons";
import styles from "@/components/richTextEditor/RichTextEditor.module.scss";
import HeadingLevelDropdown from "@/components/richTextEditor/toolbar/HeadingLevelDropdown";
import UnderlineButton from "@/components/richTextEditor/toolbar/UnderlineButton";
import BoldButton from "@/components/richTextEditor/toolbar/BoldButton";
import ItalicButton from "@/components/richTextEditor/toolbar/ItalicButton";
import StrikethroughButton from "@/components/richTextEditor/toolbar/StrikethroughButton";
import BulletedListButton from "@/components/richTextEditor/toolbar/BulletedListButton";
import NumberedListButton from "@/components/richTextEditor/toolbar/NumberedListButton";
import HorizontalRuleButton from "@/components/richTextEditor/toolbar/HorizontalRuleButton";
import RemoveTextFormattingButton from "@/components/richTextEditor/toolbar/RemoveTextFormattingButton";
// Required for font-awesome styles to be available in IsolatedComponents
import "@fortawesome/fontawesome-svg-core/styles.css";

const Toolbar: React.FunctionComponent = () => {
  const OverflowPopover = (
    <Popover id="toolbar-overflow-popover" className={styles.toolbarButtons}>
      <ButtonGroup size="sm" className="mr-2">
        <UnderlineButton />
        <StrikethroughButton />
      </ButtonGroup>
      <ButtonGroup size="sm">
        <HorizontalRuleButton />
        <RemoveTextFormattingButton />
      </ButtonGroup>
    </Popover>
  );

  return (
    <ButtonToolbar
      className={styles.toolbar}
      aria-label="Rich-Text Editor Toolbar"
    >
      <HeadingLevelDropdown />
      <ButtonGroup size="sm" className="mr-2">
        <BoldButton />
        <ItalicButton />
      </ButtonGroup>

      <ButtonGroup size="sm" className="mr-2">
        <BulletedListButton />
        <NumberedListButton />
      </ButtonGroup>

      <ButtonGroup size="sm">
        <OverlayTrigger
          trigger="click"
          placement="bottom"
          rootClose
          overlay={OverflowPopover}
        >
          <Button variant="default" aria-label="More editing options">
            <FontAwesomeIcon icon={faEllipsisH} />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    </ButtonToolbar>
  );
};

export default Toolbar;
