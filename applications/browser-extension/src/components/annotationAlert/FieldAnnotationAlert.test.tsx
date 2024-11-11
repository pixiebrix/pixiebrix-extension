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
import { render, screen } from "@/pageEditor/testHelpers";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { type FieldAnnotationAction } from "@/components/form/FieldAnnotation";

describe("FieldAnnotationAlert", () => {
  const action: FieldAnnotationAction = {
    caption: "Test Action",
    async action() {},
  };

  test("renders error", () => {
    const { asFragment } = render(
      <FieldAnnotationAlert
        type={AnnotationType.Error}
        message="Error annotation"
        actions={[action]}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText("Error annotation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /test action/i,
      }),
    ).toBeInTheDocument();
  });

  test("renders warning", () => {
    const { asFragment } = render(
      <FieldAnnotationAlert
        type={AnnotationType.Warning}
        message="Warning annotation"
        actions={[action]}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText("Warning annotation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /test action/i,
      }),
    ).toBeInTheDocument();
  });

  test("renders info", () => {
    const { asFragment } = render(
      <FieldAnnotationAlert
        type={AnnotationType.Info}
        message="Info annotation"
        actions={[action]}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText("Info annotation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /test action/i,
      }),
    ).toBeInTheDocument();
  });
});
