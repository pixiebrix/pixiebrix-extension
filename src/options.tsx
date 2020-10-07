import "regenerator-runtime/runtime";
import "core-js/stable";
import ReactDOM from "react-dom";
import React from "react";
import App from "@/options/App";
import { initRollbar } from "@/telemetry/rollbar";

// import for side effects
import "@/telemetry/mixpanel";
import "@/base.scss";

initRollbar();

ReactDOM.render(<App />, document.getElementById("container"));
