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

export function safeTrack(event_name: string, props: object) {
  if (process.env.MIXPANEL_BROWSER_TOKEN) {
    try {
      mixpanel.track(event_name, props);
    } catch (exc) {}
  } else {
  }
}
