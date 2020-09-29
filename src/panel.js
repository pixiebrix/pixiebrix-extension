import "regenerator-runtime/runtime";
import "core-js/stable";
import ReactDOM from "react-dom";
import React from "react";

import Panel from "@/devTools/Panel";

import "bootstrap/dist/css/bootstrap.min.css";

ReactDOM.render(<Panel />, document.getElementById("container"));
