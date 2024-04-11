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
import { render, screen, fireEvent } from "@testing-library/react";
import StopPropagation from "./StopPropagation";
import ClickableElement from "@/components/ClickableElement";

describe("StopPropagation", () => {
  it("stops propagation of click events", () => {
    const onClick = jest.fn();
    render(
      <ClickableElement onClick={onClick}>
        <StopPropagation onClick>
          <button>Click me</button>
        </StopPropagation>
      </ClickableElement>,
    );

    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stops propagation of key events", () => {
    const onKeyDown = jest.fn();
    const onKeyPress = jest.fn();
    const onKeyUp = jest.fn();
    render(
      <div onKeyDown={onKeyDown} onKeyPress={onKeyPress} onKeyUp={onKeyUp}>
        <StopPropagation onKeyDown onKeyPress onKeyUp>
          <button>Press me</button>
        </StopPropagation>
      </div>,
    );

    fireEvent.keyDown(screen.getByText("Press me"));
    fireEvent.keyPress(screen.getByText("Press me"));
    fireEvent.keyUp(screen.getByText("Press me"));
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(onKeyPress).not.toHaveBeenCalled();
    expect(onKeyUp).not.toHaveBeenCalled();
  });
});
