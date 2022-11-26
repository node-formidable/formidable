const readBooleans = (fields: any, listOfBooleans: string[]) => {
  // html forms do not send off at all
  const fieldsWithBooleans = { ...fields };
  listOfBooleans.forEach((key) => {
    fieldsWithBooleans[key] = fields[key] === `on` || fields[key] === true;
  });
  return fieldsWithBooleans;
};

export { readBooleans };
