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

/**
 * @file Read by:
 * - Webpack to create individual bundles
 * - IsolatedComponent.tsx to ensure the `{webpackChunkName}.css` file will exist
 * - ESLint to validate the usage of `webpackChunkName`
 */

// These URLs are not automatically updated when refactoring.
// TODO: Find a format supported by IDEs. https://github.com/microsoft/TypeScript/issues/43759#issuecomment-2041000482

// Path rules:
// - Use relative paths from the `src` directory
// - Do not start with `/`
// - Do not add the file extension
const isolatedComponentList = [
  "bricks/renderers/PropertyTree",
  "bricks/renderers/CustomFormComponent",
  "bricks/renderers/documentView/DocumentView",
  "bricks/transformers/ephemeralForm/EphemeralFormContent",
  "components/selectionToolPopover/SelectionToolPopover",
  "contentScript/textSelectionMenu/SelectionMenu",
];

export default isolatedComponentList;
