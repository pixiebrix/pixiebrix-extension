import axios, { AxiosRequestConfig } from "axios";
import { liftBackground } from "@/background/protocol";

export interface SerializedResponseError {
  data: null;
  error: string;
  statusCode: number;
}

// function transformRequestError(error: AxiosError): SerializedResponseError {
//     console.debug("Request error", error);
//     return {
//         data: null,
//         error: error.response.statusText,
//         statusCode: error.response.status,
//     };
// }

// Types we want to pass in might not have an index signature, and we want to provide a default
// eslint-disable-next-line @typescript-eslint/ban-types
export const post = liftBackground(
  "HTTP_POST",
  async (
    url: string,
    data: object,
    config?: { [key: string]: string | string[] }
  ) => {
    return await axios.post(url, data, config);
  }
);

export const request = liftBackground(
  "HTTP_REQUEST",
  (config: AxiosRequestConfig) => axios(config)
);
