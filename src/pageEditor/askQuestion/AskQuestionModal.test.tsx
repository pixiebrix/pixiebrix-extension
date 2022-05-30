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
import AskQuestionModal from "@/pageEditor/askQuestion/AskQuestionModal";
import { render, screen } from "@testing-library/react";

describe("AskQuestionModal", () => {
  test("it renders", () => {
    render(<AskQuestionModal showModal={true} setShowModal={jest.fn()} />);

    expect(screen.getByRole("button", { name: /join slack/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /start a new discussion/i })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /schedule/i })).toBeVisible();
  });
});
