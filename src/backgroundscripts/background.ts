//'use strict';   

import * as convert from 'xml-js';


chrome.runtime.onInstalled.addListener(() => {
    //save headers in a variable in onbeforeheader

    //headers salvati da richiesta precedentemente bloccata
    let headersx: [string, string][] = [];

    //signature salvata da richiesta precedentemente bloccata
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

                //senza l'header x-signature il sito vdan manda in logout
                newHeaders.push({ name: "X-Signature", value: signature || "" });

                return { requestHeaders: newHeaders };
            }
            return { requestHeaders: details.requestHeaders };
        },
        { urls: ["<all_urls>"] },
        ["requestHeaders", "blocking"]
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
                console.log("aka");
                const bytes = new Uint8Array(details.requestBody.raw[0].bytes || []);
                const postedString = decodeURIComponent(
                    String.fromCharCode(...bytes)
                );

                let options = { compact: true, ignoreComment: true, spaces: 4 };
                let result = convert.xml2json(postedString, options); // to convert xml text to javascript object

                const jsonObject = JSON.parse(result);

                //if the lesson status is already completed then don't do anything and let the request pass
                if(jsonObject["trackobj"]["cmi"]["core"]["lesson_status"]["_text"] == "completed"){
                    return { cancel: false };
                }

                //change the lesson status to completed and the score to 100
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


                //in realtà non funziona perchè viene bloccato da chrome l'aggiunta dei cookie
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


                //block the original request
                return { cancel: true };
            }
        },
        { urls: ["<all_urls>"] },
        ["requestBody", "blocking"]
    );
});



