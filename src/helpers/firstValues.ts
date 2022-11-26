import { multipartType } from '../plugins/multipart';
import { querystringType } from '../plugins/querystring';
import { Formidable, IFields } from '../types';

const firstValues = (form: Formidable, fields: IFields, exceptions: string[] = []) => {
  if (form.type !== querystringType && form.type !== multipartType) {
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
};

export { firstValues };
