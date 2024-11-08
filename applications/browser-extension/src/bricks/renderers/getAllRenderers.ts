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

import HtmlRenderer from "./HtmlRenderer";
import { IFrameRenderer } from "./iframe";
import MarkdownRenderer from "./MarkdownRenderer";
import { PropertyTableRenderer } from "./propertyTable";
import { CustomFormRenderer } from "./customForm";
import { TableRenderer } from "./table";
import { DocumentRenderer } from "./document";
import { type Brick } from "../../types/brickTypes";

function getAllRenderers(): Brick[] {
  return [
    new HtmlRenderer(),
    new IFrameRenderer(),
    new MarkdownRenderer(),
    new PropertyTableRenderer(),
    new CustomFormRenderer(),
    new TableRenderer(),
    new DocumentRenderer(),
  ];
}

export default getAllRenderers;
