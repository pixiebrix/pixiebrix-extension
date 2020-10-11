import axios, { AxiosRequestConfig } from "axios";
import { liftBackground } from "@/background/protocol";

export const post = liftBackground(
  "HTTP_POST",
  async (
    url: string,
    // Types we want to pass in might not have an index signature, and we want to provide a default
    // eslint-disable-next-line @typescript-eslint/ban-types
    data: object,
    config?: { [key: string]: string | string[] }
  ) => {
    return await axios.post(url, data, config);
  }
);

export const requestWithAuth = liftBackground(
  "HTTP_REQUEST",
  (authId: string, config: AxiosRequestConfig) => {
    return axios(config);
  }
);

export const request = liftBackground(
  "HTTP_REQUEST",
  (config: AxiosRequestConfig) => axios(config)
);
