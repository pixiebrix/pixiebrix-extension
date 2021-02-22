/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// https://transitory.technology/browser-extensions-and-csp-headers/
// Load the passed URL into an another iframe to get around the parent page's CSP headers

const params = new URLSearchParams(window.location.search);

const url = new URL(params.get("url"));
const nonce = params.get("nonce");

if (nonce) {
  url.searchParams.set("_pb", nonce);
}

const iframe = document.createElement("iframe");
iframe.src = url.toString();
document.body.appendChild(iframe);

// import {REQUEST_FRAME_DATA} from "@/messaging/constants";
// import {sendMessage} from "@/chrome";
//
// const id = new URLSearchParams(window.location.search).get('id');
//
// console.log(`Loaded iframe ${id}`);
//
// document.addEventListener("DOMContentLoaded", async function(){
//     const response = await sendMessage(REQUEST_FRAME_DATA, {id});
//     console.log(`receive ${REQUEST_FRAME_DATA}`, response)
//     document.body.innerHTML = response.html;
// });
