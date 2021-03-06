const fetch = require('isomorphic-fetch');

const getTodayDateString = () => {
  const [dateString] = new Date().toISOString().match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);

  return dateString;
};

const getHistoricalUrl = date => `https://scraper.fun/scrape?s-url=https%3A%2F%2Fcoinmarketcap.com%2Fhistorical%2F${date.replace(/-/g, '')}%2F&s-scope=table%23currencies-all%20tbody%20tr&name=.currency-name%20.currency-name-container&symbol=.col-symbol&price=.price&marketCap=.market-cap&s-limit=100`;

const presentUrl = 'https://scraper.fun/scrape?s-url=https%3A%2F%2Fcoinmarketcap.com&s-scope=table%23currencies%20tbody%20tr&s-limit=100&name=.currency-name%20.currency-name-container&symbol=.currency-name%20.currency-symbol&price=.price&marketCap=.market-cap';

const formatCoins = data => data.map(({ name, symbol, price, marketCap }, index) => {
  const extractMoney = (money) => {
    const res = /^\$([0-9.]+)$/.exec(money);

    return res && res[1] ? +res[1] : 0;
  };

  return {
    index: index + 1,
    symbol,
    name,
    price: +extractMoney(price),
    marketCap: +extractMoney(marketCap),
  };
});

const fetchCoins = async (date) => {
  const res = await fetch(
    date && date !== getTodayDateString() ? getHistoricalUrl(date) : presentUrl,
  );
  const data = await res.json();

  return formatCoins(data);
};

const filterCoinsByPrice = (coins, min, max) => coins.filter(({ price }) => {
  if (min && max) {
    return min <= price && price <= max;
  } else if (min) {
    return min <= price;
  } else if (max) {
    return price <= max;
  }

  return true;
});

// eslint-disable-next-line max-len
const filterCoinsByCoins = (coins, ignores) => coins.filter(({ symbol }) => ignores.indexOf(symbol) === -1);

const getTopHoldings = (coinsOnStartDate, coinsOnEndDate, min, max, ignores, top) => {
  // eslint-disable-next-line max-len
  const topHoldings = filterCoinsByCoins(filterCoinsByPrice(coinsOnStartDate, min, max), ignores).slice(0, top);

  return topHoldings.map(({ index, symbol, name, price, marketCap }) => {
    const coin = coinsOnEndDate.find(coinOnEndDate => coinOnEndDate.symbol === symbol);

    return {
      symbol,
      name,
      lastIndex: index,
      lastPrice: price,
      lastMarketCap: marketCap,
      index: coin ? coin.index : undefined,
      price: coin ? coin.price : undefined,
      marketCap: coin ? coin.marketCap : undefined,
    };
  });
};

const calculateROI = (coins, investmentOfEach) => {
  const totalInvestment = investmentOfEach * coins.length;
  // eslint-disable-next-line max-len,no-mixed-operators
  const totalReturn = coins.reduce((total, { lastPrice, price }) => total + (investmentOfEach * (price || 0) / lastPrice), 0);
  const returnRate = totalReturn / totalInvestment;

  return {
    totalInvestment,
    totalReturn,
    returnRate,
  };
};

const calculate = async ({ top = 10, from = '2017-01-01', to = '2017-12-31', min = 0, max = 0, ignores = [], investmentOfEach = 1000 }) => {
  const coinsOnStartDate = await fetchCoins(from);
  const coinsOnEndDate = await fetchCoins(to);

  const topHoldings = getTopHoldings(coinsOnStartDate, coinsOnEndDate, min, max, ignores, top);

  const { totalInvestment, totalReturn, returnRate } = calculateROI(topHoldings, investmentOfEach);

  return {
    coins: topHoldings,
    investmentOfEach,
    totalInvestment,
    totalReturn,
    returnRate,
  };
};

module.exports = {
  calculate,
};
