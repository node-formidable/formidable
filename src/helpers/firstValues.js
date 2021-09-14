export { firstValues };

/* Gets first values of fields, like pre 3.0.0 without multiples    
 pass in a list of exceptions where arrays of strings is still wanted */
const firstValues = (fields, exceptions = []) => {
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
        if (exceptions.includes(key)) {
            return [key, value];
        }
        return [key, value[0]];    
    }));
};
