const AMAZON_SMID = 'AN1VRQENFRJN5';
const VARIOUS = 'VARIOUS';
const AMAZON = 'AMAZON';

class Extractor {
  constructor(pattern, group) {
    this.regexp = new RegExp(pattern, 'g');
    this.group = group;
  }

  extract(str) {
    let result = [...str.matchAll(this.regexp)];
    return result.length > 0 ? result[0][this.group] : null;
  }

  extractLast(str) {
    let result = [...str.matchAll(this.regexp)];
    if (result.length > 0) {
        return result[result.length-1][this.group];
    } else {
        return null;
    }
  }
}

let asinExtractor = new Extractor('(?:\\/|%2F)(?:dp|gp\\/product)(?:\\/|%2F)([0-9A-Z]+)', 1);
let smidExtractor = new Extractor('[?&;]smid=([0-9A-Z]{6,})', 1);
let mExtractor = new Extractor('[?&;]m=([0-9A-Z]{6,})', 1);
let sellerExtractor = new Extractor("[?&;]seller=([0-9A-Z]+)[^\'\"]*[\'\"] id=[\'\"]sellerProfileTriggerId[\'\"]", 1);

let isSoldByAmazon = (html) => html.includes("<a href='/gp/help/customer/display.html?ie=UTF8&amp;nodeId=643004'>Amazon.co.jp</a>");

class Retriever {
  retrieve(id, callback) {
    return undefined;
  }
}

class QueuedGetExecutor {
  constructor(concurrency) {
    this.queue = [];
    this.concurrency = concurrency;
    this.running = 0;
  }

  get(url, callback) {
    log.debug('Schedule: ', url);
    this.queue.push({url: url, callback: callback});
    this.check();
  }

  check() {
    if (this.running < this.concurrency) {
      let task = this.queue.shift();
      if (task !== undefined) {
        this.running += 1;
        log.debug('Execute: ', task.url);
        $.get(task.url, (data) => {
            task.callback(data);
        }).always(() => {
            this.running -= 1;
            this.check();
        });
      }
    }
  }
}

class UrlGenerator {
  static getSellerUrl(smid) {
    if (smid === AMAZON_SMID) {
      return '/gp/help/customer/display.html?ie=UTF8&amp;nodeId=643004';
    } else if (smid === VARIOUS) {
      return 'javascript: void(0);';
    } else {
      return 'https://www.amazon.co.jp/sp?marketplaceID=A1VC38T7YXB528&seller=' + smid;
    }
  }

  static getProductUrl(asin) {
    return 'https://www.amazon.co.jp/dp/' + asin;
  }
}

class SellerCountryRetriever extends Retriever {
  static countryExtractor = new Extractor('<span class="a-list-item">([A-Z]{2})</span>', 1);

  constructor() {
    super();
    this.executor = new QueuedGetExecutor(1);
  }

  retrieve(smid, callback) {
    this.executor.get(UrlGenerator.getSellerUrl(smid), (data) => {
      callback(SellerCountryRetriever.countryExtractor.extractLast(data) || '??');
    });
  }
}

class ProductSellerRetriever extends Retriever {
  retrieve(asin, callback) {
    $.get(UrlGenerator.getProductUrl(asin), (data) => {
      let smid = sellerExtractor.extract(data);
      if (isSoldByAmazon(data)) {
        callback(AMAZON_SMID);
      } else if (smid !== null) {
        callback(smid);
      } else {
        callback(VARIOUS);
      }
    });
  }
}

class CachedRetriever extends Retriever {
  constructor(initialCache, retriever) {
    super();
    this.initialCache = initialCache;
    this.cache = Object.assign({}, initialCache);
    this.retriever = retriever;
  }

  retrieve(id, callback) {
    if (this.cache[id] !== undefined) {
      return callback(this.cache[id]);
    }
    this.retriever.retrieve(id, (result) => {
      this.cache[id] = result;
      callback(result);
    });
  }

  clearCache() {
    this.cache = Object.assign({}, this.initialCache);
  }
}

let productSellerRetriever = new CachedRetriever({}, new ProductSellerRetriever());
let sellerCountryRetriever = new CachedRetriever({
    AN1VRQENFRJN5: AMAZON,
    VARIOUS: VARIOUS
  },
  new SellerCountryRetriever()
);

class Flag {
  static flagUrl = 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.4.3/flags/4x3/{}.svg';
  static table = {
    AMAZON: 'https://cdnjs.cloudflare.com/ajax/libs/simple-icons/3.0.1/amazon.svg',
    '??': 'https://cdnjs.cloudflare.com/ajax/libs/open-iconic/1.1.1/png/person-4x.png',
    VARIOUS: 'https://cdnjs.cloudflare.com/ajax/libs/open-iconic/1.1.1/png/list-4x.png'
  };

  static getUrl(country) {
    if (country === undefined || country === null) {
      return Flag.table[VARIOUS];
    } else if (Flag.table[country] === undefined) {
       Flag.table[country] = Flag.flagUrl.replace('{}', country.toLowerCase());
    }
    return Flag.table[country];
  }
}

class HTML{
  static css(map) {
    var result = '';
    $.each(map, (k, v) => {
        if (v !== undefined && v !== null) {
            result += k + ':' + v + '; ';
        }
    });
    return result;
  }

  static tagOpen(name, attr) {
      var result = '<' + name + ' ';
      $.each(attr, (k, v) => {
          if (v !== undefined && v !== null) {
              result += k + '="' + v + '" ';
          }
      });
      result += '>';
      return result;
  }

  static tagClose(name) {
      return '</' + name + '>';
  }

  static tag(name, attr, contents) {
      return HTML.tagOpen(name, attr) + contents + HTML.tagClose(name);
  }
}

class LinkGenerator {
  static BG_COLORS = {
    AMAZON: 'orange',
    VARIOUS: 'white',
    JP: 'white',
    CN: 'red',
    '??': 'lightgrey'
  };

  static MESSAGE = {
    VARIOUS: '複数の出品情報があるか、セラーが特定できませんでした。',
    '??': 'セラーの住所情報が見つかりません。気をつけてください。'
  };

  static getMessage(country) {
    return LinkGenerator.MESSAGE.hasOwnProperty(country) ? (': ' + LinkGenerator.MESSAGE[country]) : '';
  }

  static generate(smid, country, imgWidth) {
    let bg = LinkGenerator.BG_COLORS[country] || 'white';
    let h = imgWidth * 3 / 4;

    let img = HTML.tagOpen('img', {
      style: HTML.css({
          'max-width': '100%',
          'max-height': '100%'
      }),
      src: Flag.getUrl(country)
    });

    return HTML.tag('a', {
      class: 'amz-cntry',
      style: HTML.css({
          position: 'absolute',
          width: imgWidth + 'px',
          height: h + 'px',
          'z-index': '1000',
          'text-align': 'center',
          'background-color': bg,
          filter: 'drop-shadow(1px 1px 2px #aaa)'
      }),
      href: UrlGenerator.getSellerUrl(smid),
      target: 'amz_seller',
      title: country + LinkGenerator.getMessage(country),
      'amz-done': 'true'
    }, img);
  }
}

class CountryFlagAdder {
  getAncestorNode(elm, tag, levelMax) {
    var curr = elm;
    for (let i=0; i<levelMax; i++) {
      curr = curr.parentElement;
      if (curr === undefined) {
        return undefined;
      } else if (curr.tagName.toLowerCase() === tag) {
        return curr;
      }
    }
    return undefined;
  }

  decideParent(img) {
    let li = this.getAncestorNode(img, 'li', 3);
    if (li !== undefined) {
      return li;
    } else {
      return img.parentElement.parentElement;
    }
  }

  addLink(elm, smid, country, width) {
    $(elm).prepend(LinkGenerator.generate(smid, country, width));
  }

  findImg(elm) {
    return $(elm).find('img')[0];
  }

  static decideWidth(imgWidth) {
      if (imgWidth === undefined) {
          return 32;
      }
      return imgWidth < 120 ? 24 : 32;
  }

  addLinkBySellerId(img, smid) {
    log.debug('addLinkBySellerId: ', smid);
    sellerCountryRetriever.retrieve(smid, (country) => {
      log.debug(smid + ": " + country);
      let w = CountryFlagAdder.decideWidth($(img).width());
      this.addLink(this.decideParent(img), smid, country, w);
    });
  }

  addLinkByAsin(img, asin) {
    log.debug('addLinkByAsin: ', asin);
    productSellerRetriever.retrieve(asin, (smid) => {
      log.debug('ASIN: %s => SMID: %s', asin, smid);
      this.addLinkBySellerId(img, smid);
    });
  }

  addLinkToMainImage(smid, country) {
    $('#main-image-container').prepend(LinkGenerator.generate(smid, country, 32))
  }

  processMainImage() {
    let url = window.location.href;
    let asin = asinExtractor.extract(url);
    if (asin !== null) {
      let ppdHtml = $('#ppd').html();
      let smid = smidExtractor.extract(url) || sellerExtractor.extract(ppdHtml);
      if (smid !== null) {
        sellerCountryRetriever.retrieve(smid, (country) => {
          this.addLinkToMainImage(smid, country);
        });
      } else if (isSoldByAmazon(ppdHtml)) {
        this.addLinkToMainImage(AMAZON_SMID, AMAZON);
      }
    }
  }

  processElement(elm) {
    let url = $(elm).attr("href");
    if (url === undefined) {
      return;
    }
    let asin = asinExtractor.extract(url);
    let smid = smidExtractor.extract(url) || mExtractor.extract(url);
    if (asin !== null || smid !== null) {
      log.debug("ASIN: %s, Seller: %s, URL: %s", asin, smid, url);
      let img = this.findImg(elm);
      if (img !== undefined) {
        if (smid !== null) {
          this.addLinkBySellerId(img, smid);
        } else {
          this.addLinkByAsin(img, asin);
        }
      }
    } else {
      log.debug("No match:", url);
    }
  }

  scanElements(self) {
    if (chrome.app.isInstalled === undefined) {
      return self.disable();
    }
    var processed = false;
    $('a').each((idx, elm) => {
      if ($(elm).attr('amz-done') !== 'true') {
        $(elm).attr('amz-done', 'true');
        self.processElement(elm);
        processed = true;
      }
    });
    if (processed) {
      productSellerDao.sync(productSellerRetriever.cache);
      sellerCountryDao.sync(sellerCountryRetriever.cache);
    }
  }

  enable() {
    productSellerDao.sync(productSellerRetriever.cache);
    sellerCountryDao.sync(sellerCountryRetriever.cache);
    $('a.amz-cntry').show();
    this.processMainImage();
    this.timerId = setInterval(this.scanElements, 1500, this);
  }

  disable() {
    clearInterval(this.timerId);
    $('a.amz-cntry').hide();
  }
}

$(document).ready(() => {
  adder = new CountryFlagAdder();
  enabledDao.get((enabled) => {
    if (enabled) {
        adder.enable();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log.debug(request.message);
    if(request.message === 'disable') {
      adder.disable();
    } else if (request.message === 'enable') {
      adder.enable();
    } else if (request.message === 'clearCache') {
      productSellerRetriever.clearCache();
      sellerCountryRetriever.clearCache();
    }
  });

  chrome.runtime.onConnect.addListener(() => {
      chrome.runtime.connect().onDisconnect.addListener(() => {
          log.debug('disconnected');
          adder.disable();
      });
  });
});
