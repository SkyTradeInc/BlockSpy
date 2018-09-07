const Web3 = require('web3');
const fs = require('fs');
const express = require('express');
const InputDataDecoder = require('ethereum-input-data-decoder');
const chalk = require('chalk');
const hexToDec = require('hex-to-dec');
const beep = require('beepbeep')
const app = express();
const request = require('request');
const ftp = require('ftp');
var file = 'data.json';
var data = JSON.parse(fs.readFileSync(file, 'utf8'));

const bitfinexaddress = '876eabf441b2ee5b5b0554fd502a8e0600950cfa';
const binanceaddress = '3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be';
const bittrexaddress ='fbb1b73c4f0bda4f67dca266ce6ef42f520fbb98';
const kucoinaddress = '2B5634C42055806a59e9107ED44D43c426E58258';
const biboxaddress = '';

// Connect to Parity Node
const ethereumUri = 'http://localhost:8545';
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(ethereumUri));

if(!web3.isConnected()){
  console.log(chalk.bgYellow('[!] Unable to connect to Blockchain at ' + ethereumUri));
} else {
  console.log(chalk.green("[+] Connection to Blockchain successful"));
}

var server = app.listen(8081, function() {
  console.log(chalk.green('[+] Listening on port:', server.address().port));
  console.log('\n');
});

var filter = web3.eth.filter('latest');
filter.watch(function(error, result){
  var block = web3.eth.getBlock(result, true);
  getBlock(block.number);
  console.log(chalk.bgGreen.bold('[New Block] #' + block.number));
});

function getPriceBittrex(coin, fname) {
  var prices = [];
  var i = 0;
  var requestLoop = setInterval(function(){
    if (prices.length == 40 ) {
      console.log(prices);

      fs.appendFile(fname, JSON.stringify(prices), function (err){
        if (err) {
          console.log(chalk.bgRed.bold("Error appending data for " + coin));
        }
      });
      clearInterval(requestLoop);
    }

    request({
        url: 'https://bittrex.com/api/v1.1/public/getticker?market=BTC-'+coin+'BTC',
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10,
        json: true
    },function(error, response, body){
      if(body) {
        if(body.sucess == true) {
          var btcprice = {
            minute: i,
            price: body.result.Last,
          }
          prices.push(btcprice);
          i+=0.5;
        }
      }
    });

  }, 30000);
}

function getPriceBinance(coin, fname) {
  var prices = [];
  var i = 0;
  var requestLoop = setInterval(function(){
    if (prices.length == 40 ) {
      console.log(prices);

      fs.appendFile(fname, JSON.stringify(prices), function (err){
        if (err) {
          console.log(chalk.bgRed.bold("Error appending data for " + coin));
        }
      });
      clearInterval(requestLoop);
    }

    request({
        url: 'https://api.binance.com/api/v1/ticker/price?symbol='+coin+'BTC',
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10,
        json: true
    },function(error, response, body){
      if(body) {
      var btcprice = {
        minute: i,
        price: body.price,
      }
      prices.push(btcprice);
      i+=0.5;
      }
    });

  }, 30000);
}



function getBlock(i) {
  web3.eth.getBlock(i, function(error, result){
      if(!error) {
          var blockjson = result;
          checkBlock(blockjson);
          fs.writeFileSync('blocks/'+i+'.json',blockjson,{encoding:'utf8',flag:'w'});
      }
  });
}



function checkBlock(block) {
  //console.log(block);
  console.log("     TX(s): " + block.transactions.length);
  for(var i=0; i<block.transactions.length;i++) {
    tx = block.transactions[i];
    checkTransaction(tx);
  }
}

function parseDecimals(qty, n) {
		x = qty / (Math.pow(10,n));
		return x;
}



function checkTransaction(tx) {
  web3.eth.getTransaction(tx, function(error, result){
      if(!error) {
        if (result) {
        let to = result.to;
        for(var y=0; y<data.length; y++) {
          if (to == data[y].contract) {
            var input = result.input;
            var decoder = new InputDataDecoder(data[y].abi);
            var decoded = decoder.decodeData(input);
            var sentto = decoded.inputs[0];
            var qty = String(decoded.inputs[1]);
            var json = JSON.stringify(result);
            var qty = parseDecimals(qty,data[y].decimals);
            console.log('     ' + chalk.bgCyan.bold(data[y].symbol + ' Transfer Detected  |  Qty: ' + qty));
            if(binanceaddress == sentto) {
              console.log('     ' + chalk.bgRed.bold("* * Binance * * "));
              if(data[y].qty) {
                if(qty > data[y].qty) {
                  var timestamp = Date.now();
                  var fname = 'logs/'+timestamp+'-'+data[y].symbol+'.txt';
                  getPriceBinance(data[y].symbol, fname);
                  beep(1);
                  console.log('          ' + chalk.bgRed.bold("* * Logging * * "));
                }
              }
            } else if (bittrexaddress == sentto) {
              console.log('     ' + chalk.bgRed.bold("* * Bittrex * * "));
              if(data[y].qty) {
                if(qty > data[y].qty) {
                  var timestamp = Date.now();
                  var fname = 'logs/'+timestamp+'-'+data[y].symbol+'.txt';
                  getPriceBittrex(data[y].symbol, fname);
                  beep(1);
                  console.log('          ' + chalk.bgRed.baold("* * Logging * * "));
                }
              }
            } else if (kucoinaddress == sentto) {
              console.log('     ' + chalk.bgRed.bold("* * Kucoin * * "));
              if(data[y].qty) {
                if(qty > data[y].qty) {
                  //var timestamp = Date.now();
                  //var fname = 'logs/'+timestamp+'-'+data[y].symbol+'.txt';
                  //getPriceBittrex(data[y].symbol, fname);
                  beep(1);
                  console.log('          ' + chalk.bgRed.bold("* * Logging * * "));
                }
              }

            } else if (bitfinexaddress == sentto) {
              console.log('     ' + chalk.bgRed.bold("* * Bitfinex * * "));
              if(data[y].qty) {
                if(qty > data[y].qty) {
                  //var timestamp = Date.now();
                  //var fname = 'logs/'+timestamp+'-'+data[y].symbol+'.txt';
                  //getPriceBittrex(data[y].symbol, fname);
                  beep(1);
                  console.log('          ' + chalk.bgRed.bold("* * Logging * * "));
                }
              }

            }
          }
        }
      }
    } else {
      console.log(chalk.bgYellow("TX Check Error: " + tx));
      checkTransaction(tx);
    }
  });

}
