export { readBooleans };

/* html form input type="checkbox" only send the value "on" if checked,
convert it to booleans for each input that is a checkbox*/
const readBooleans = (fields, listOfBooleans) => {
    // html forms do not send off at all
    const fieldsWithBooleans = Object.assign({}, fields);
    listOfBooleans.forEach(key => {
        fieldsWithBooleans[key] = fields[key] === `on` || fields[key] === true;
    });
    return fieldsWithBooleans;
};
