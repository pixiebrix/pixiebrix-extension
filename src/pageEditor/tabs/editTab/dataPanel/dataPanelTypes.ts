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

export enum DataPanelTabKey {
  /**
   * The input arguments/variables for the brick
   * @since 2.0.7 consolidated Context and Rendered Args tabs into a single tab
   */
  Input = "input",
  /**
   * The mod variables and page state
   * @since 2.0.5 renamed from page state and always displayed
   */
  ModVariables = "modVariables",
  /**
   * The brick output/output preview
   * @since 2.0.7 contains both the output and preview
   */
  Output = "output",
  /**
   * Design tab for the form/document builder
   * @since 2.0.7 split from the Preview tab
   */
  Design = "design",
  /**
   * Outline tab for the document builder
   */
  Outline = "outline",
  /**
   * Brick comments. Currently not supported for starter bricks.
   */
  Comments = "comments",
  /**
   * Developer Only: Formik form state for the mod component form
   */
  ModComponentFormState = "modComponentFormState",
  /**
   * Developer Only: Formik form state for the selected node, i.e., brick or starter brick
   */
  NodeFormState = "nodeFormState",
}
