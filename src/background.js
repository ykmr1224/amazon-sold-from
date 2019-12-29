let getUrlCondition = (url) => {
  return new chrome.declarativeContent.PageStateMatcher({
    pageUrl: {hostEquals: url},
  });
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [getUrlCondition("www.amazon.co.jp")],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
