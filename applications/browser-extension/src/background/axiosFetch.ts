// Required for axios-fetch-adapter
import "regenerator-runtime/runtime";
import axios from "axios";

import fetchAdapter from "@vespaiach/axios-fetch-adapter";

axios.defaults.adapter = fetchAdapter;
