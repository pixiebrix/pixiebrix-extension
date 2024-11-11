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

import { type Schema, type UiSchema } from "@/types/schemaTypes";

export type FormDefinition = {
  /**
   * RJSF schema for the form.
   */
  schema: Schema;
  /**
   * RJSF uiSchema for the form.
   */
  uiSchema: UiSchema;
  /**
   * True if the form is cancellable.
   */
  cancelable: boolean;
  /**
   * The caption of the form submit button.
   */
  submitCaption: string;
  /**
   * The location of the ephemeral form.
   *
   * Added to help determine which forms will be displayed once the sidebar initializes.
   *
   * @see getFormPanelEntries
   * @since 1.7.29
   */
  location: "sidebar" | "modal";
  /**
   * URLs for custom stylesheets to use and override base bootstrap theme in the form
   *
   * @since 1.8.8
   */
  stylesheets?: string[];
  /**
   * Disable the default/inherited styling for the rendered form
   *
   * @since 1.8.8
   */
  disableParentStyles?: boolean;
};
