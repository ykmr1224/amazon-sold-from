
let generateMap = (name, value) => {
  let map = {};
  map[name] = value;
  return map;
};

class StorageDao {
  constructor(name, defValue, sync) {
    this.name = name;
    this.defValue = defValue;
    this.target = sync ? chrome.storage.sync : chrome.storage.local;
  }

  get(callback) {
    this.target.get([this.name], (result) => {
      callback(result[this.name] !== undefined ? result[this.name] : this.defValue);
    });
  }

  set(value, callback) {
    this.target.set(generateMap(this.name, value), callback);
  }

  sync(data) {
    let key = this.name;
    this.get((value) => {
      $.each(data, (k, v) => {
        value[k] = v;
      });
      $.each(value, (k, v) => {
        data[k] = v;
      });
      this.set(value, () => {
        log.debug('saved data');
      });
    });
  }

  clear() {
    this.set(this.defValue, () => log.debug('Cleared storage attribute: ' + this.name));
  }
}

class LocalStorageDao extends StorageDao {
  constructor(name, defValue) {
    super(name, defValue, false);
  }
}

class SyncStorageDao extends StorageDao {
  constructor(name, defValue) {
    super(name, defValue, true);
  }
}

let enabledDao = new LocalStorageDao('enabled', true);
let productSellerDao = new LocalStorageDao('productSeller', {});
let sellerCountryDao = new LocalStorageDao('sellerCountry', {});
