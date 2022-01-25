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

/**
 * Pseudos act as filters on the current selection so, given an element, we ensure
 * it’s what the specified labelSelector points to.
 * @usage $("input:labelledby(label:contains('Name'))")
 * @usage $(":labelledby(:contains('Name'))") // Poor performance
 */
$.expr.pseudos.labelledby = $.expr.createPseudo((labelSelector) => (element) =>
  $<HTMLLabelElement>(labelSelector)
    .get()
    .some((labelElement) => labelElement.htmlFor === element.id)
);
