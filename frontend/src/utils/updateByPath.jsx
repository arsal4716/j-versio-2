export const updateByPath = (obj, path, value) => {
  const keys = path.split(".");
  const result = structuredClone(obj);
  let cur = result;

  keys.slice(0, -1).forEach(k => {
    if (!cur[k]) cur[k] = {};
    cur = cur[k];
  });

  cur[keys[keys.length - 1]] = value;
  return result;
};
