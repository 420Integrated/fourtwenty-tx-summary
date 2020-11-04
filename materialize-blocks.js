'use strict'
const Block = require('fourtwentyjs-block')
const Transaction = require('fourtwentyjs-tx')
const fourtwentyUtil = require('fourtwentyjs-util')

module.exports = blockFromRpc

/**
 * Creates a new block object from 420coin JSON RPC.
 * @param {Object} blockParams - 420coin JSON RPC of block (fourtwenty_getBlockByNumber)
 * @param {Array.<Object>} Optional list of 420coin JSON RPC of uncles (fourtwenty_getUncleByBlockHashAndIndex)
 */
function blockFromRpc (blockParams, uncles) {
  uncles = uncles || []
  let block = new Block({
    transactions: [],
    uncleHeaders: []
  })
  let blockHeader = block.header
  blockHeader.parentHash = blockParams.parentHash
  blockHeader.uncleHash = blockParams.sha3Uncles
  blockHeader.coinbase = blockParams.miner
  blockHeader.stateRoot = blockParams.stateRoot
  blockHeader.transactionsTrie = blockParams.transactionsRoot
  blockHeader.receiptTrie = blockParams.receiptRoot || blockParams.receiptsRoot || fourtwentyUtil.SHA3_NULL
  blockHeader.bloom = blockParams.logsBloom
  blockHeader.difficulty = blockParams.difficulty
  blockHeader.number = blockParams.number
  blockHeader.smokeLimit = blockParams.smokeLimit
  blockHeader.smokeUsed = blockParams.smokeUsed
  blockHeader.timestamp = blockParams.timestamp
  blockHeader.extraData = blockParams.extraData
  blockHeader.mixHash = blockParams.mixHash
  blockHeader.nonce = blockParams.nonce

  // override hash incase something was missing
  blockHeader.hash = function () {
    return fourtwentyUtil.toBuffer(blockParams.hash)
  }

  block.transactions = (blockParams.transactions || []).map(function (_txParams) {
    let txParams = Object.assign({}, _txParams)
    normalizeTxParams(txParams)
    // override from address
    let fromAddress = fourtwentyUtil.toBuffer(txParams.from)
    delete txParams.from
    let tx = new Transaction(txParams)
    tx._from = fromAddress
    tx.getSenderAddress = function () { return fromAddress }
    // override hash
    let txHash = fourtwentyUtil.toBuffer(txParams.hash)
    tx.hash = function () { return txHash }
    return tx
  })
  block.uncleHeaders = uncles.map(function (uncleParams) {
    return blockFromRpc(uncleParams).header
  })

  return block
}

function normalizeTxParams (txParams) {
  // hot fix for https://github.com/fourtwentyjs/fourtwentyjs-util/issues/40
  txParams.smokeLimit = (txParams.smokeLimit === undefined) ? txParams.smoke : txParams.smokeLimit
  txParams.data = (txParams.data === undefined) ? txParams.input : txParams.data
  // strict byte length checking
  txParams.to = txParams.to ? fourtwentyUtil.setLengthLeft(fourtwentyUtil.toBuffer(txParams.to), 20) : null
  // v as raw signature value {0,1}
  txParams.v = txParams.v < 27 ? txParams.v + 27 : txParams.v
}