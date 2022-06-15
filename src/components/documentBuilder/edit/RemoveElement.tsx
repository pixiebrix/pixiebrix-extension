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
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import useDeleteElement from "@/components/documentBuilder/hooks/useDeleteElement";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { useSelector } from "react-redux";

type RemoveElementProps = {
  documentBodyName: string;
};

const RemoveElement: React.FC<RemoveElementProps> = ({ documentBodyName }) => {
  const activeElement = useSelector(selectNodePreviewActiveElement);
  const deleteElement = useDeleteElement(documentBodyName);
  const onDelete = () => {
    deleteElement(activeElement);
  };

  return (
    <Button onClick={onDelete} variant="danger" size="sm">
      <FontAwesomeIcon icon={faTrash} /> Remove element
    </Button>
  );
};

export default RemoveElement;
