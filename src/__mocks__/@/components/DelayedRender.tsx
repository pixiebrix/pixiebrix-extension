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

/**
 * A mock for DelayedRender, because otherwise you have to use jest fake timers in tests.
 */
const DelayedRender: React.FC = ({ children }) => (
  // Unlike the real DelayedRender, this wraps in a div so that we can add a data-testid for testing
  <div data-testid="DelayedRender">{children}</div>
);

export default DelayedRender;
