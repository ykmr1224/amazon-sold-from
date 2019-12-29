let enabledBtn = document.getElementById('enabled');
let clearCacheBtn = document.getElementById('clearCache');
enabledDao.get((enabled) => {
  log.debug('enabled: ' + enabled);
  enabledBtn.checked = enabled;
});

let executeAtActiveTab = (callback) => {
  chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
    var activeTab = tabs[0];
    callback(activeTab);
  });
};

enabledBtn.addEventListener('change', () => {
  executeAtActiveTab((activeTab) => {
    let message = enabledBtn.checked ? 'enable' : 'disable';
    enabledDao.set(enabledBtn.checked);
    chrome.tabs.sendMessage(activeTab.id, {"message": message});
  });
});

clearCacheBtn.addEventListener('click', () => {
  executeAtActiveTab((activeTab) => {
    productSellerDao.clear();
    sellerCountryDao.clear();
    chrome.tabs.sendMessage(activeTab.id, {"message": 'clearCache'});
  });
});
