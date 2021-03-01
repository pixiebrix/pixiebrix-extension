// https://chatlio.com/docs/content-security-policy-csp/

// defined via define plugin
// eslint-disable-next-line no-undef
const supportWidgetId = process.env.SUPPORT_WIDGET_ID;

window._chatlio = window._chatlio || [];
// eslint-disable-next-line no-undef
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
