import { sheetsHandler } from "@/contrib/googleSheets";

const API_KEY = process.env.GOOGLE_API_KEY;

const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

function initGoogle() {
  if (!API_KEY || API_KEY === "undefined") {
    throw new Error("Google API_KEY not set");
  }

  // https://bumbu.me/gapi-in-chrome-extension
  function onGAPILoad() {
    gapi.client
      .init({
        // Don't pass client nor scope as these will init auth2, which we don't want until the user actually
        // uses a brick
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      })
      .then(
        function () {
          console.log("gapi initialized");
        },
        function (error) {
          console.error("Error initializing gapi", error);
        }
      );
  }

  (window as any).onGAPILoad = onGAPILoad;

  chrome.runtime.onMessage.addListener(sheetsHandler);
}

export default initGoogle;
