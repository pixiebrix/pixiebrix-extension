// https://transitory.technology/browser-extensions-and-csp-headers/
// Load the passed URL into an iframe to get around the parent page's CSP headers
const url = decodeURIComponent(window.location.search.replace("?url=", ""));
const iframe = document.createElement("iframe");
iframe.src = url;
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
