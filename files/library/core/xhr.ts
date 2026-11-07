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
export async function JSONQuery(url: string): Promise<JSONResult> {
    let response: Response;
    let text: string;
    try {
        response = await fetch(url);
        text = await response.text();
    } catch {
        throw "Unable to retrieve the document!";
    }

    return {
        ok: response.ok,
        json: <T>() => JSON.parse(text) as T,
    };
}
