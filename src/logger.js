const noop = () => {};
const logLevels = {
  debug: {level: 0, method: console.debug},
  info: {level: 1, method: console.info},
  warn:{level: 2, method: console.warn},
  error: {level: 3, method: console.error}
};

let getLogger = (threshold) => {
  let result = {};
  for (let name in logLevels) {
    let level = logLevels[name];
    result[name] = (level.level >= threshold.level) ? level.method : noop;
  }
  return result;
};

let log = getLogger(document.cookie.includes('debug=1') ? logLevels.debug : logLevels.info);
