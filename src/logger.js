const NOOP = () => {};
const LOG_LEVELS = {
  debug: {level: 0, method: console.debug},
  info: {level: 1, method: console.info},
  warn:{level: 2, method: console.warn},
  error: {level: 3, method: console.error}
};

let getLogger = (threshold) => {
  let result = {};
  for (let name in LOG_LEVELS) {
    let level = LOG_LEVELS[name];
    result[name] = (level.level >= threshold.level) ? level.method : NOOP;
  }
  return result;
};

let log = getLogger(document.cookie.includes('debug=1') ? LOG_LEVELS.debug : LOG_LEVELS.info);
