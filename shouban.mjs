import fs, { readFile, readFileSync } from 'fs';
import path from 'path';
function getCurrentTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
console.log('今日日期:', getCurrentTime());
const today = readFileSync(getCurrentTime() + '.json', 'utf8');
const todayjson = JSON.parse(today.toString());
/**
 * 获取指定目录下的所有文件列表
 * 
 * @param {string} directoryPath - 要扫描的目录路径（默认当前目录）
 * @param {string} [fileType] - 文件类型过滤器（如 '.json'）
 * @param {boolean} [recursive=true] - 是否递归搜索子目录
 * @returns {Array<string>} 包含文件路径的数组
 */
function getFilesInDirectory(directoryPath = '.', fileType, recursive = true) {
    try {
        let results = [];
        const files = fs.readdirSync(directoryPath);
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                if (recursive) {
                    results = results.concat(getFilesInDirectory(filePath, fileType, recursive));
                }
            } else if (!fileType || file.endsWith(fileType)) {
                results.push(filePath);
            }
        }
        console.log(`成功获取 ${results.length} 个文件`);
        return results;
    } catch (error) {
        console.error(`获取文件列表失败: ${error.message}`);
        return [];
    }
}
function findMultiBullStocks(stocks, config = {}) {
  // 设置默认配置
  const { shortMA5 = 5, midMA20 = 20, midMA60 = 60 } = config;
  // 1. 数据预处理
  // 按日期排序（从新到旧）
  const sortedData = [...stocks].sort((a, b) =>
    new Date(b["日期"]) - new Date(a["日期"])
  );
  // 2. 提取收盘价（近期在前）
  const closingPrices = sortedData.map(item => (item["收盘"] || item["最新价"]));
  // 检查数据是否足够
  if (closingPrices.length < midMA60) {
    // console.warn(`数据不足：需要至少${midMA60}个交易日数据，当前只有${closingPrices.length}个`);
    return [];
  }
  // 3. 计算移动平均线
  const calcMA = (period) => {
    return closingPrices
      .slice(0, period)
      .reduce((sum, price) => sum + price, 0) / period;
  };

  const shortAvg = calcMA(shortMA5);
  const midAvg = calcMA(midMA20);
  const longAvg = calcMA(midMA60);
  // 4. 多头排列条件：短期 > 中期 > 长期
  const isMultiBull = shortAvg > midAvg && midAvg > longAvg;
  return isMultiBull ? [{
    symbol: stocks[0]["股票代码"],
    name: stocks[0]["股票名称"],
    shortMA5: shortAvg,
    midMA20: midAvg,
    midMA60: longAvg,
    closingPrices
  }] : [];
}
const config = {
  shortMA5: 10,
  midMA20: 30,
  midMA60: 60
};
// 示例用法
// 获取当前目录下所有 JSON 文件
// const jsonFiles = getFilesInDirectory('.', '.json');

// 获取 data 目录下所有 JSON 文件
const stockFiles = getFilesInDirectory('./data', '.json');
console.log(stockFiles.length + ' files found.');
// 提取股票代码（去掉 .json 后缀）
const stockCodes = stockFiles.map(file => {
    const fileName = path.basename(file);
    return path.parse(fileName).name;  // 使用 path 模块安全处理文件名
});

const getabs =  (a, b) => {
    return Math.abs(a - b) / b;
}
const periods = [5, 10, 20]; // 短期、中期、长期均线

// 计算斜率
function calculateSlope(priceArray, period, rrr) {
    // 1. 计算均线值
    const maValues = [];
    // console.log(priceArray, 'priceArray')
    if (priceArray.length < period) {
        console.log(`数据不足：需要至少${period}个数据点`, rrr);
        return null;
    }

    // 计算移动平均值
    for (let i = period - 1; i < priceArray.length; i++) {
        const slice = priceArray.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        maValues.push(sum / period);
    }

    // 2. 计算斜率（线性回归，最近两个点）
    if (maValues.length < 2) {
        console.log("数据不足：至少需要2个均线值计算斜率");
        return null;
    }

    // 斜率 = (当前均线值 - 前一期均线值)
    const lastMA = maValues[maValues.length - 1];
    const prevMA = maValues[maValues.length - 2];
    return lastMA - prevMA;
}

/**
 * 获取斜率评级（中文描述）
 * @param {number} slope - 斜率值
 * @returns {string} 斜率强度评级
 */
function getSlopeDescription(slope) {
    if (slope === null) return "无法计算";
    if (Math.abs(slope) < 0.001) return "无明显趋势";
    const sign = slope > 0 ? "上升" : "下降";
    const absValue = Math.abs(slope);

    if (absValue < 0.01) return `${sign}趋势(微弱)`;
    else if (absValue < 0.03) return `${sign}趋势(中等)`;
    else return `${sign}趋势(强劲)`;
}


/**
 * 计算近N日的股票涨跌幅
 * @param {number[]} prices - 股票收盘价列表（按时间顺序排列，最新在最后）
 * @param {number} [days=5] - 计算涨跌幅的天数（默认5日）
 * @returns {number|null} N日涨跌幅百分比（保留2位小数），数据不足时返回null
 */
function calculateChangeRate(prices, days = 5, name) {
    if (!Array.isArray(prices) || prices.length < days) {
        return null;
    }
    // prices = prices.slice(0, days);
    const lastPrice = prices[prices.length - 1];        // 最新收盘价
    const daysAgoPrice = prices[prices.length - days]; // N天前的收盘价
    if (name === "四方新材") {
        console.log(lastPrice, daysAgoPrice, "四方新材")
    }
    // 计算涨跌幅 = (最新价 - N天前价格) / N天前价格 * 100%
    const changeRate = ((lastPrice - daysAgoPrice) / daysAgoPrice) * 100;
    return parseFloat(changeRate.toFixed(2));  // 保留2位小数
}

function writetext(params) {
    return;
    fs.appendFileSync('result.json', `${params}\n`);
}

let index = 0;
let santianweisuo = [];
let santianjinguo = [];
let ertianweisuo = [];
let ertianjinguo = [];
function writetongjitext(params) {
            fs.appendFileSync('result-tongji.json', `${params}\n`);
    return;
    if (index % 2 === 0) {
        fs.appendFileSync('result-tongji.json', `${params}`);
    } else {
        fs.appendFileSync('result-tongji.json', `${params}\n`);
    }
    index++;
}
// === 实际使用示例 ===
// 用于盘中筛选

const run1 = (pluse, istest) => {
    const zhangarr = [];
    const lvarr = [];
    const zongarr = [];
    todayjson.forEach(stock => {
        if (stockCodes.includes(stock['股票代码'])) {
            const res = fs.readFileSync(`./data/${stock['股票代码']}.json`, 'utf8');
            let stockDatas = JSON.parse(res);
            let slicelength = 0;
            if (istest) {
                slicelength = stockDatas.length - pluse - 1
            } else {
                slicelength = stockDatas.length - pluse
            }
            const newdss = stockDatas.slice(0, slicelength);
            const result = findMultiBullStocks([...newdss], config);
            // if (stock['股票代码'] === "002055") {
            //     console.log(result, '---')
            // }
            if (result.length > 0) {
                const stock = result[0];
                // console.log(`${stock.name}(${stock.symbol}) 当前处于多头排列状态：`);
                // console.log(`  短期均线(${config.shortMA5}日): ${stock.shortMA5.toFixed(2)}`);
                // console.log(`  中期均线(${config.midMA20}日): ${stock.midMA20.toFixed(2)}`);
                // console.log(`  长期均线(${config.midMA60}日): ${stock.midMA60.toFixed(2)}`);
            } else {
                return;
            }

            stockDatas = stockDatas.reverse()
            let sliceArr = stockDatas.slice(0 + pluse, 30 + pluse);
            if (sliceArr.length === 0) return;
            const one = sliceArr[0]
            const first = istest ? sliceArr[1]: sliceArr[0];
            const dier  = istest ? sliceArr[2]: sliceArr[1];
            const disan = istest ? sliceArr[3]: sliceArr[2];
            const disi  = istest ? sliceArr[4]: sliceArr[3];
            const firstkaipan = first['开盘'] || first['今开'];
            const firstshoupan = first['收盘'] || first['最新价'];
            const diyitianshiti = (firstkaipan - firstshoupan) / firstkaipan * 100;

            if (first['涨跌幅'] < 0 && diyitianshiti < 3 && dier['涨跌幅'] < 0  && disan['涨跌幅'] <0 &&  disi["涨跌幅"] > 0
            ) {
                const date = one["最新交易日"] || one["日期"];
                const closingPricess = result[0].closingPrices.slice(0, result[0].closingPrices.length - pluse);
                const closingPricess5 = result[0].closingPrices.slice(0, result[0].closingPrices.length - pluse - 2);
                const slope = calculateSlope(closingPricess.reverse(), 10,  result[0]);
                let js5 = [];
                if (istest) {
                    js5 = closingPricess5.slice(3, 8);
                }else {
                    js5 = closingPricess5.slice(2, 7);
                }
                const slope5 = calculateChangeRate([...js5].reverse(), 5);
                const description = getSlopeDescription(slope);
                // if (stock['股票名称'] === "002055") {
                //     console.log(slope, first['涨跌幅'] < 0 , diyitianshiti < 3 , dier['涨跌幅'] < 0  , disan['涨跌幅'] <0 ,  disi["涨跌幅"] > 0)
                // }
                if (slope > 0.03) {
                    // console.log("5日线", slope5, `${date} - ${one['股票名称']} 前一天涨跌: ${first['涨跌幅']}, ${diyitianshiti.toFixed(2)}, 涨跌幅: ${one['涨跌幅']}%`);
                    zongarr.push({
                        slope5,
                        des:  `${date} - ${one['股票名称']} 前一天涨跌: ${first['涨跌幅']}, ${diyitianshiti.toFixed(2)}, 涨跌幅: ${one['涨跌幅']}%`,
                        zhangdie: one['涨跌幅'],
                        date,
                    })
                    if (one["涨跌幅"] > 0) {
                        zhangarr.push(one["涨跌幅"])
                    }else {
                        lvarr.push(one["涨跌幅"])
                    }
                }
            }
        } else {
            // console.log(`Stock not found: ${stock['股票代码']} - ${stock['股票名称']}`);
        }
    });
    zongarr.sort((a, b) => a.slope5 - b.slope5).forEach((item) => {
        console.log(item.slope5,  item.des);
        writetext(`${item.slope5}, ${item.des}`);
    })
    const firstzhangdie = zongarr.slice(0, 4).reduce((acc, cur) => acc + cur.zhangdie, 0);
    const endzhangdie = zongarr.slice(zongarr.length - 4, zongarr.length).reduce((acc, cur) => acc + cur.zhangdie, 0);
    console.log(`3天猥琐, ${firstzhangdie}`);
    console.log(`3天进攻, ${endzhangdie}`);
    santianweisuo.push(firstzhangdie);
    santianjinguo.push(endzhangdie);
    writetongjitext(`日期: ${zongarr[0]["date"]}, 3天猥琐, ${firstzhangdie.toFixed(2)}  3天进攻, ${endzhangdie.toFixed(2)}`);

    writetext(`3天猥琐, ${firstzhangdie}`);
    writetext(`3天进攻, ${endzhangdie}`);

    writetext(`涨, ${zhangarr.length}, ${calculateAverage(zhangarr)}`);
    writetext(`跌, ${lvarr.length}, ${calculateAverage(lvarr)}`);
    writetext(`总共: ${[...zhangarr, ...lvarr].length}, 平均: ${calculateAverage([...zhangarr, ...lvarr])}`);

    console.log("涨", zhangarr.length, calculateAverage(zhangarr))
    console.log("跌", lvarr.length, calculateAverage(lvarr))
    console.log("平均",calculateAverage([...zhangarr, ...lvarr]))

}

const run2 = (pluse, istest) => {
    const zhangarr = [];
    const lvarr = [];
    const zongarr = [];
    todayjson.forEach(stock => {
        if (stockCodes.includes(stock['股票代码'])) {
            const res = fs.readFileSync(`./data/${stock['股票代码']}.json`, 'utf8');
            let stockDatas = JSON.parse(res);
            let slicelength = 0;
            if (istest) {
                slicelength = stockDatas.length - pluse - 1
            } else {
                slicelength = stockDatas.length - pluse
            }
            const newdss = stockDatas.slice(0, slicelength);
            
            const result = findMultiBullStocks([...newdss], config);
            if (stock['股票名称'] === "四方新材") {
                console.log(newdss[newdss.length - 1])
            }
            if (result.length > 0) {
            const stock = result[0];
            // console.log(`${stock.name}(${stock.symbol}) 当前处于多头排列状态：`);
            // console.log(`  短期均线(${config.shortMA5}日): ${stock.shortMA5.toFixed(2)}`);
            // console.log(`  中期均线(${config.midMA20}日): ${stock.midMA20.toFixed(2)}`);
            // console.log(`  长期均线(${config.midMA60}日): ${stock.midMA60.toFixed(2)}`);
            } else {
                return;
            }

            stockDatas = stockDatas.reverse()
            let sliceArr = stockDatas.slice(0 + pluse, 30 + pluse);
            if (sliceArr.length === 0) return;
            const one = sliceArr[0]
            const first = istest ? sliceArr[1]: sliceArr[0];
            const dier  = istest ? sliceArr[2]: sliceArr[1];
            const disan = istest ? sliceArr[3]: sliceArr[2];
            const disi  = istest ? sliceArr[4]: sliceArr[3];
            const firstkaipan = first['开盘'] || first['今开'];
            const firstshoupan = first['收盘'] || first['最新价'];
            const dierjinkai = dier['开盘'] || dier['今开'];
            const diershoupan = dier['收盘'] || dier['最新价'];
            const diyitianshiti = (firstkaipan - firstshoupan) / firstkaipan * 100;
            const diershiti = (dierjinkai - diershoupan) / dierjinkai * 100;
            // if (stock['股票名称'] === "海正药业") {
            //     console.log(first['涨跌幅'] > -10 , first['涨跌幅'] < 0 , diyitianshiti < 2 , dier['涨跌幅'] < 0  , disan['涨跌幅'] > 2
            // , diershiti < 10)
            // }
            if (first['涨跌幅'] > -10 && first['涨跌幅'] < 0 && diyitianshiti < 2 && dier['涨跌幅'] < 0  && disan['涨跌幅'] > 2
            && diershiti < 10
            ) {
                const date = one["最新交易日"] || one["日期"];
                const closingPricess = result[0].closingPrices.slice(0, result[0].closingPrices.length - pluse);
                const closingPricess5 = result[0].closingPrices.slice(0, result[0].closingPrices.length - pluse);
                const eeeee = closingPricess
                const slope10 = calculateSlope(closingPricess.reverse(), 10,  result[0]);
                let js5 = [];
                if (istest) {
                    js5 = closingPricess5.slice(2, 7);
                }else {
                    js5 = closingPricess5.slice(2, 7);
                }
                const slope5 = calculateChangeRate([...js5].reverse(), 5, stock['股票名称']);
                if (stock['股票名称'] === "四方新材") {
                    console.log(JSON.stringify(js5), slope5, slope10, eeeee[eeeee.length - 1], "js5")
                }
                
                if (slope10 > 0.03) {
                    // 股票代码: ${one['股票代码']}
                    // console.log("5日线", slope5, `${date} - ${one['股票名称']} 前一天涨跌: ${first['涨跌幅']}, ${diyitianshiti.toFixed(2)}, 涨跌幅: ${one['涨跌幅']}%`);
                    zongarr.push({
                        slope5,
                        des:  `${date} - ${one['股票名称']} 前一天涨跌: ${first['涨跌幅']}, ${diyitianshiti.toFixed(2)}, 涨跌幅: ${one['涨跌幅']}%`,
                        zhangdie: one['涨跌幅'],
                        date,
                        js5,
                    })
                    if (one["涨跌幅"] > 0) {
                        zhangarr.push(one["涨跌幅"])
                    }else {
                        lvarr.push(one["涨跌幅"])
                    }
                }
            }
        } else {
            // console.log(`Stock not found: ${stock['股票代码']} - ${stock['股票名称']}`);
        }
    });
    zongarr.sort((a, b) => a.slope5 - b.slope5).forEach((item) => {
        console.log(item.slope5,  item.des);
        writetext(`${item.slope5}, ${item.des}`);
    })
    const firstzhangdie = zongarr.slice(0, 4).reduce((acc, cur) => acc + cur.zhangdie, 0);
    const endzhangdie = zongarr.slice(zongarr.length - 4, zongarr.length - 0).reduce((acc, cur) => acc + cur.zhangdie, 0);
    console.log("2天猥琐", firstzhangdie, "2天进攻", endzhangdie);
    ertianweisuo.push(firstzhangdie);
    ertianjinguo.push(endzhangdie);
    writetongjitext(` 日期: ${zongarr[0]["date"]},   2天猥琐, ${firstzhangdie.toFixed(2)}  2天进攻, ${endzhangdie.toFixed(2)}`);
    writetext(`2天猥琐, ${firstzhangdie}`);
    writetext(`2天进攻, ${endzhangdie}`);

    writetext(`涨, ${zhangarr.length}, ${calculateAverage(zhangarr)}`);
    writetext(`跌, ${lvarr.length}, ${calculateAverage(lvarr)}`);
    writetext(`总共: ${[...zhangarr, ...lvarr].length} 平均: ${calculateAverage([...zhangarr, ...lvarr])}`);

    console.log("涨", zhangarr.length, calculateAverage(zhangarr))
    console.log("跌", lvarr.length, calculateAverage(lvarr))
    console.log("平均", calculateAverage([...zhangarr, ...lvarr]))
}

function calculateAverage(arr) {
    const sum = arr.reduce((acc, cur) => acc + cur, 0);
    return sum / arr.length;
}

function addsum(arr) {
    return arr.reduce((acc, cur) => acc + cur, 0);
}

for (let i = 40; i >= 0; i--) {
    // run1(i, true);
    run2(i, true);
}
// run1(0, false);
// run2(0, true);


console.log("3天猥琐平均", addsum(santianweisuo) / santianweisuo.length);
console.log("3天进攻平均", addsum(santianjinguo) / santianjinguo.length);
console.log("2天猥琐平均", addsum(ertianweisuo) / ertianweisuo.length);
console.log("2天进攻平均", addsum(ertianjinguo) / ertianjinguo.length);

// run1(1, true);
// run2(1, true);



