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

import { useDispatch } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

const elementsParentRegexp =
  /(?<parentElementName>.*)\.((config\.element\.__value__)|(children\.\d+))/;

const getParentElementName = (elementName: string): string | null => {
  const match = elementsParentRegexp.exec(elementName);
  if (!match) {
    return null;
  }

  const {
    groups: { parentElementName },
  } = match;

  return parentElementName;
};

function useSelectParentElement() {
  const dispatch = useDispatch();
  return (elementName: string) => {
    const parentElementName = getParentElementName(elementName);
    dispatch(editorActions.setNodePreviewActiveElement(parentElementName));
  };
}

export default useSelectParentElement;
