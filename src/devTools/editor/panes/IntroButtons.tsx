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

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button } from "react-bootstrap";
import AskQuestionModalButton from "@/devTools/editor/askQuestion/AskQuestionModalButton";

const IntroButtons: React.VoidFunctionComponent = () => (
  <>
    <p className="text-center">
      <Button
        size="sm"
        href="https://docs.pixiebrix.com/quick-start-guide"
        target="_blank"
        // @ts-expect-error -- rel is a standard attribute of <a> tag
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} /> Open quick start
      </Button>
    </p>

    <p className="text-center">
      <AskQuestionModalButton />
    </p>
  </>
);

export default IntroButtons;
