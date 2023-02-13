const Web3 = require("web3");
const web3 = new Web3("https://mainnet.infura.io/v3/aca3c97932404c688ce15fbde82ae06c");
const BigNumber = require('bignumber.js');
const async = require('async');

async function getBlockByTimeStamp(targetTimestamp) {
  let averageBlockTime = 17 * 1.5

  const currentBlockNumber = await web3.eth.getBlockNumber()
  let block = await web3.eth.getBlock(currentBlockNumber)

  let blockNumber = currentBlockNumber

  let requestsMade = 0

  while(block.timestamp > targetTimestamp){

    let decreaseBlocks = (block.timestamp - targetTimestamp) / averageBlockTime
    decreaseBlocks = parseInt(decreaseBlocks)

    if(decreaseBlocks < 1){
      break
    }

    blockNumber -= decreaseBlocks

    block = await web3.eth.getBlock(blockNumber)
    requestsMade += 1
  }

  return block
}

async function getHolders(blockHeight) {
  const contractAddress = "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d";
  let holders = [];
  let pageNumber = 0;
  let hasMore = true;

  do {
    try {
      let result
      const response = await fetch(`https://api.covalenthq.com/v1/1/tokens/${contractAddress}/token_holders/?key=ckey_2ccd755b77754cefbb818bc5127&page-number=${pageNumber}&block-height=${blockHeight.number}`);

      if (response.ok) {
        result = await response.json();
        holders = [...holders, ...result.data.items]
      }

      if (result.data.pagination.has_more) {
        pageNumber += 1;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(error);
    }

  } while (hasMore)

  return holders
}

async function getTotalETHValue(epochTime) {
  const blockHeight = await getBlockByTimeStamp(epochTime)
  const holders = await getHolders(blockHeight);

  let totalETHValue = new BigNumber('0');
  
  await async.mapLimit(holders, 40, async (holder) => {
    const balance = await web3.eth.getBalance(holder.address, blockHeight.number);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    totalETHValue = totalETHValue.plus(new BigNumber(balanceInEther));
  });
  
  return totalETHValue.toFixed(8, 1);
}

const epochTime = parseInt(process.argv[2]);
getTotalETHValue(epochTime).then(console.log);