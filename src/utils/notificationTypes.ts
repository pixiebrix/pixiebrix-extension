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

import type { RequireAtLeastOne } from "type-fest";

export type NotificationType =
  | "info"
  | "success"
  | "error"
  | "warning"
  | "loading";

export type NotificationPosition =
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type Notification = RequireAtLeastOne<
  {
    title?: string;
    message?: string;
    type?: NotificationType;
    id?: string;
    autoDismissTimeMs?: number;
    error?: unknown;
    dismissable?: boolean;
    reportError?: boolean;
    includeErrorDetails?: boolean;
    position?: NotificationPosition;
  },
  "message" | "error"
>;
