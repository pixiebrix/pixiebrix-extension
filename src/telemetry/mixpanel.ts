/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import mixpanel from "mixpanel-browser";

if (process.env.MIXPANEL_BROWSER_TOKEN) {
  mixpanel.init(process.env.MIXPANEL_BROWSER_TOKEN);

  const container = document.getElementById("container");
  const { user } = container?.dataset ?? {};
  if (user) {
    mixpanel.identify(user);
  }

  mixpanel.track("Page View", { location: document.location.href });
} else {
  console.debug("Mixpanel not configured");
}

export function safeTrack(
  event_name: string,
  props: Record<string, unknown>
): void {
  if (process.env.MIXPANEL_BROWSER_TOKEN) {
    try {
      mixpanel.track(event_name, props);
    } catch (exc) {
      // pass
    }
  } else {
    // pass
  }
}
