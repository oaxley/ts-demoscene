/*
 * @file    xhr.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Perform an Ajax request
 */

//----- imports


//----- interfaces
export interface JSONResult {
    ok: boolean;
    json: <T>() => T;
}


//----- functions
/* send a GET AJAX query
 *
 * Args:
 *      url: the HTTP url to query
 *
 * Returns:
 *      a JSONResult response
 */
export function JSONQuery(url: string): Promise<JSONResult> {
    // parse the AJAX query
    function parseResults(xhr: XMLHttpRequest): JSONResult {
        return {
            ok: (xhr.status >= 200) && (xhr.status < 300),
            json: <T>() => JSON.parse(xhr.responseText) as T
        };
    }

    // promise
    return new Promise<JSONResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("get", url);
        xhr.onerror = (event) => {
            reject("Unable to retrieve the document!");
        }
        xhr.onloadend = (event) => {
            resolve(parseResults(xhr));
        }
        xhr.send();
    });
}