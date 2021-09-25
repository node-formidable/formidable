export { readBooleans };

const readBooleans = (fields, listOfBooleans) => {
    // html forms do not send off at all
    const fieldsWithBooleans = Object.assign({}, fields);
    listOfBooleans.forEach(key => {
        fieldsWithBooleans[key] = fields[key] === `on` || fields[key] === true;
    });
    return fieldsWithBooleans;
};
