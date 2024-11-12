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

import { truncate } from "lodash";
import React from "react";
import { Button } from "react-bootstrap";

const LinkPreviewActions: React.FC<{
  href: string;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ href, onEdit, onRemove }) => (
  <span className="d-flex align-items-center">
    <span className="text-nowrap mr-1">Visit url:</span>
    <a href={href} target="_blank" rel="noopener noreferrer" className="mr-2">
      {truncate(href, {
        length: 20,
        omission: "...",
      })}
    </a>
    <Button variant="link" onClick={onEdit} className="mr-2">
      Edit
    </Button>
    <Button variant="link" onClick={onRemove}>
      Remove
    </Button>
  </span>
);

export default LinkPreviewActions;
