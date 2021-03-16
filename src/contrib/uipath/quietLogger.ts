/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Replicate surface area used by UiPath appinsightsLogger so we can noop them
 */
export class ApplicationInsights {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trackEvent(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trackException(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trackPageView(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loadAppInsights(): void {}
}
