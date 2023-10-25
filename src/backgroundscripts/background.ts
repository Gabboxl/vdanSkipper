//'use strict';   

import * as convert from 'xml-js';


chrome.runtime.onInstalled.addListener(() => {
    //save headers in a variable in onbeforeheader

    let headersx: [string, string][] = [];

    let signature: string | undefined = ""; 

    chrome.webRequest.onBeforeSendHeaders.addListener(
        //save headers
        function (details) {
            //if there is an header called "Side" then add it to headersx
            const headers = details.requestHeaders || [];
            const sideHeader = headers.find(header => header.name === "X-Signature");
            if (sideHeader) {
                //headersx.push(["Side", sideHeader.value]);
                signature = sideHeader.value;
            }


            if (details.url.startsWith("https://vialedaniele.it/formazione/appLms/modules/scorm/soaplms.php?op=Finish")) {
                const headers = details.requestHeaders || [];

                const newHeaders = headers.map(header => {
                    if (header.name === "Origin") {
                        return { name: "Origin", value: "https://vialedaniele.it" };
                    } else if (header.name === "Referer") {
                        return { name: "Referer", value: "https://vialedaniele.it/formazione/appLms/index.php?" };
                    } else {
                        return header;
                    }

                });

                newHeaders.push({ name: "X-Signature", value: signature || "" });

                return { requestHeaders: newHeaders };
            }
            return { requestHeaders: details.requestHeaders };
        },
        { urls: ["<all_urls>"] },
        ["requestHeaders", "blocking"] // add "blocking" to modify headers
    );



    chrome.webRequest.onBeforeRequest.addListener(
        function (details) {
            if (
                details.method == "POST" &&
                details.url.startsWith(
                    "https://vialedaniele.it/formazione/appLms/modules/scorm/soaplms.php?op=Finish"
                ) &&
                details.requestBody?.raw?.length
            ) {
                // Use this to decode the body of your post
                console.log("GABBANA");
                const bytes = new Uint8Array(details.requestBody.raw[0].bytes || []);
                const postedString = decodeURIComponent(
                    String.fromCharCode(...bytes)
                );

                let options = { compact: true, ignoreComment: true, spaces: 4 };
                let result = convert.xml2json(postedString, options); // to convert xml text to javascript object

                const jsonObject = JSON.parse(result);

                if(jsonObject["trackobj"]["cmi"]["core"]["lesson_status"]["_text"] == "completed"){
                    return { cancel: false };
                }

                jsonObject["trackobj"]["cmi"]["core"]["lesson_status"]["_text"] =
                    "completed";
                jsonObject["trackobj"]["cmi"]["core"]["score"]["raw"] = "100";

                let newXml = convert.js2xml(jsonObject, options); // to convert javascript object to xml text

                console.log("NEWXML: ", newXml);

                console.log(postedString);

                const newBytes = new Uint8Array(newXml.length);
                for (let i = 0; i < newXml.length; i++) {
                    newBytes[i] = newXml.charCodeAt(i);
                }


                //get cookies from current tab
                chrome.cookies.getAll({ url: details.url }, function (cookies) {
                    console.log("COOKIES: ", cookies);
                    let cookieString = "";
                    cookies.forEach(cookie => {
                        cookieString += `${cookie.name}=${cookie.value}; `;
                    });
                    console.log("COOKIE STRING: ", cookieString);

                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", details.url);
                    headersx.push(["Cookie", cookieString]);
                    headersx.forEach(header => xhr.setRequestHeader(header[0], header[1]));
                    xhr.send(newBytes);
                });
                //make a new fetch request with the new body and the same headers
                // fetch(details.url, {
                //     mode: "no-cors",
                //     method: "POST",
                //     headers: headersx,
                //     body: newBytes,
                    
                // });


                //block the original request
                return { cancel: true };

                // Make a new request with the same URL, headers, and the newBytes as the body of the POST request
                return {
             //s       requestHeaders: details.requestHeaders,
                    method: "POST",
                    url: "https://gabbana.com",
                    requestBody: { raw: [{ bytes: newBytes }] },
                };
            }
        },
        { urls: ["<all_urls>"] },
        ["requestBody", "blocking"]
    );
});



