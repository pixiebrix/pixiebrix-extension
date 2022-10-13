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

const preventDefault = (event: React.MouseEvent) => {
  event.preventDefault();
};

/**
 * Use on forms that must not be implicitly submitted via "enter key on field".
 * NOTE: It must be before any other submission buttons in the form.
 * Based on the implicit submission logic https://html.spec.whatwg.org/#implicit-submission
 */
const BlockFormSubmissionViaEnterIfFirstChild = () => (
  <input type="submit" disabled hidden onClick={preventDefault} />
);

export default BlockFormSubmissionViaEnterIfFirstChild;
