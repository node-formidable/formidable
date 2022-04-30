/**
 * Html form input type="checkbox" only send the value "on" if checked,
 * convert it to booleans for each input that is expected to be sent as a checkbox,
 * only use after firstValues or similar was called.
 *
 * @example ```ts
 * form.parse(request, async (error, fieldsMultiple, files) => {
 *   const fieldsSingle = firstValues(form, fieldsMultiple);
 *
 *   const expectedBooleans = ['checkbox1', 'wantsNewsLetter', 'hasACar'];
 *   const fieldsWithBooleans = readBooleans(fieldsSingle, expectedBooleans);
 * });
 * ```
 */
export function readBooleans<F extends Record<string, any>, K extends keyof F>(
  fields: F,
  listOfBooleans: readonly K[],
): Omit<F, K> & Record<K, boolean> {
  // html forms do not send off at all
  const fieldsWithBooleans: Omit<F, K> & Record<K, boolean> = { ...fields };
  listOfBooleans.forEach((key) => {
    // We can safely assert this because of the type safety of listOfBooleans
    (fieldsWithBooleans as Record<K, boolean>)[key] = fields[key] === `on` || fields[key] === true;
  });
  return fieldsWithBooleans;
}
