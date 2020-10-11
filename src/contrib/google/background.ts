const API_KEY = process.env.GOOGLE_API_KEY;

// import for side-effect
import "./sheets/handlers";

const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

function initGoogle(): void {
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
}

export default initGoogle;
