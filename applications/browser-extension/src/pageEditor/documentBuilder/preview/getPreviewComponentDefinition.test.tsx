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
  type DocumentBuilderElement,
  type DocumentBuilderElementType,
} from "../documentBuilderTypes";
import getPreviewComponentDefinition from "./getPreviewComponentDefinition";
import { render, screen } from "@testing-library/react";
import documentBuilderElementTypeLabels from "../elementTypeLabels";

test.each(["container", "row", "column"])(
  "shows name of an empty %s",
  (elementType: DocumentBuilderElementType) => {
    const element: DocumentBuilderElement = {
      type: elementType,
      config: {},
      children: [],
    };

    const { Component, props } = getPreviewComponentDefinition(element);

    render(<Component {...props} />);
    expect(
      screen.getByText(documentBuilderElementTypeLabels[elementType]),
    ).not.toBeNull();
  },
);

test.each(["container", "row", "column"])(
  "doesn't show name of %s with children",
  (elementType: DocumentBuilderElementType) => {
    const element: DocumentBuilderElement = {
      type: elementType,
      config: {},
      children: [
        {
          type: "text",
          config: {
            text: "child element",
          },
        },
      ],
    };

    const { Component, props } = getPreviewComponentDefinition(element);

    render(<Component {...props} />);
    expect(
      screen.queryByText(documentBuilderElementTypeLabels[elementType]),
    ).toBeNull();
  },
);
