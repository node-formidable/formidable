export function firstValues(form, fields, exceptions = []) {
  if (form.type !== 'urlencoded' && form.type !== 'multipart') {
    return fields;
  }

  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (exceptions.includes(key)) {
        return [key, value];
      }
      return [key, value[0]];
    }),
  );
}
