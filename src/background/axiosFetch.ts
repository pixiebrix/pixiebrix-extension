// Required for axios-fetch-adapter
import "regenerator-runtime/runtime";
import axios from "axios";

// @ts-expect-error No types needed
import fetchAdapter from "@vespaiach/axios-fetch-adapter";
axios.defaults.adapter = fetchAdapter;
