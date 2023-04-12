/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { render } from "@/pageEditor/testHelpers";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { type FieldAnnotationAction } from "@/components/form/FieldAnnotation";

describe("FieldAnnotationAlert", () => {
  const action: FieldAnnotationAction = {
    caption: "Test Action",
    async action() {},
  };

  test("renders error", () => {
    const rendered = render(
      <FieldAnnotationAlert
        type={AnnotationType.Error}
        message="Error annotation"
        actions={[action]}
      />
    );
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders warning", () => {
    const rendered = render(
      <FieldAnnotationAlert
        type={AnnotationType.Warning}
        message="Warning annotation"
        actions={[action]}
      />
    );
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders info", () => {
    const rendered = render(
      <FieldAnnotationAlert
        type={AnnotationType.Info}
        message="Info annotation"
        actions={[action]}
      />
    );
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
