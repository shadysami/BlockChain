"use strict";

const SHOW = "SHOW_PRICE";
const UPDATE = "UPDATE_USD_PRICE";

let fs = require('fs');
let EventEmitter = require('events');

//  TODO: function implementation ------------------------------------------------------------------------------------------- 
function readJsonFromFile(fileName) {
    try {
        let data = fs.readFileSync(fileName, 'utf8'); // Read file synchronously
        return JSON.parse(data); // Parse JSON data
    } catch (err) {
        console.error(`Error reading file ${fileName}:`, err);
        return null; // Return null in case of an error
    }
}

// todo: End of function implementation ----------------------------------------------------------------


class CurrencyConverter extends EventEmitter {
    static calculateRates(usdPrices) {
        let rates = {};
        let usdMap = {};

        for (let i in usdPrices) {
            let o = usdPrices[i];
            let sym = o['asset_id_quote'];
            let usdRate = o['rate'];

            rates[`USD-${sym}`] = usdRate;
            rates[`${sym}-USD`] = 1 / usdRate;
            usdMap[sym] = usdRate;
        }

        let symbols = Object.keys(usdMap);
        for (let from of symbols) {
            for (let to of symbols) {
                if (from !== to) {
                    let tag = `${from}-${to}`;
                    rates[tag] = usdMap[to] / usdMap[from];
                }
            }
        }

        return rates;
    }

    constructor(coin2USD) {
        super();
        this.rates = this.constructor.calculateRates(coin2USD.rates);

        this.on(SHOW, (o) => {
            console.log("SHOW event received.");
            console.log(o);
            const { from, to } = o;
            try {
                let rate = this.convert(1, from, to);
                console.log(`1 ${from} is worth ${rate} ${to}`);
            } catch (e) {
                console.error(e.message);
            }
        });

        this.on(UPDATE, (o) => {
            const { sym, usdPrice } = o;
            if (!sym || !usdPrice || usdPrice <= 0) {
                console.error("Invalid update parameters.");
                return;
            }
            console.log(`Updating ${sym} price to ${usdPrice} USD.`);

            // Update USD rates
            this.rates[`USD-${sym}`] = usdPrice;
            this.rates[`${sym}-USD`] = 1 / usdPrice;

            // Recalculate all crypto-to-crypto rates
            const symbols = Object.keys(this.rates)
                .filter(key => key.startsWith('USD-'))
                .map(key => key.split('-')[1]);

            console.log("symbols", symbols);

            for (let from of symbols) {
                for (let to of symbols) {
                    if (from !== to) {
                        this.rates[`${from}-${to}`] = this.rates[`USD-${to}`] / this.rates[`USD-${from}`];
                    }
                }
            }

            console.log("Rates updated successfully.");
        });
    }

    convert(amount, fromUnits, toUnits) {
        let tag = `${fromUnits}-${toUnits}`;
        let rate = this.rates[tag];
        if (rate === undefined) {
            throw new Error(`Rate for ${tag} not found`);
        }
        return rate * amount;
    }
}

// Debugging statements
console.log("Starting script...");
const PATH = './rates.json';
let coin2USD = readJsonFromFile(PATH);
console.log("Loaded JSON data:", coin2USD);
let cnv = new CurrencyConverter(coin2USD);
console.log("CurrencyConverter instance created:", cnv);

// Test cases
test(4000, 'ETH', 'BTC');
test(200, 'BTC', 'EOS');

// Event handling tests
cnv.emit(SHOW, { from: "EOS", to: "BTC" });
cnv.emit(UPDATE, { sym: "BTC", usdPrice: 50000 });
cnv.emit(SHOW, { from: "LTC", to: "BTC" });

function test(amt, from, to) {
    console.log(`${amt} ${from} is worth ${cnv.convert(amt, from, to)} ${to}.`);
}