import { Schema } from "@/core";

export interface Webhook {
  id: string;
  display_name: string;
  input_schema: Schema;
  url: string;
}
