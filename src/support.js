/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// https://chatlio.com/docs/content-security-policy-csp/

const supportWidgetId = process.env.SUPPORT_WIDGET_ID;

window._chatlio = window._chatlio || [];
!(function () {
  const t = document.getElementById("chatlio-widget-embed");
  if (t && window.ChatlioReact && _chatlio.init)
    return void _chatlio.init(t, ChatlioReact);
  for (
    let e = function (t) {
        return function () {
          _chatlio.push([t].concat(arguments));
        };
      },
      i = [
        "configure",
        "identify",
        "track",
        "show",
        "hide",
        "isShown",
        "isOnline",
        "page",
        "open",
        "showOrHide",
      ],
      a = 0;
    a < i.length;
    a++
  )
    _chatlio[i[a]] || (_chatlio[i[a]] = e(i[a]));
  const n = document.createElement("script"),
    c = document.getElementsByTagName("script")[0];
  (n.id = "chatlio-widget-embed"),
    (n.src = "https://w.chatlio.com/w.chatlio-widget.js"),
    (n.async = !0),
    n.setAttribute("data-embed-version", "2.3");
  n.setAttribute("data-widget-options", '{"embedInline": true}');
  n.setAttribute("data-widget-id", supportWidgetId);
  c.parentNode.insertBefore(n, c);
})();
