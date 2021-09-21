import { multipartType } from "../plugins/multipart.js";
import { querystringType } from "../plugins/querystring.js";

export { firstValues };

/* Gets first values of fields, like pre 3.0.0 without multiples    
 pass in a list of exceptions where arrays of strings is still wanted */
const firstValues = (form, fields, exceptions = []) => {
    if (form.type !== querystringType && form.type !== multipartType) {
        return fields;
    }
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
        if (exceptions.includes(key)) {
            return [key, value];
        }
        return [key, value[0]];    
    }));
};
