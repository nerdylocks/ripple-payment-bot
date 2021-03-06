var GatewaydClient = require(__dirname+'/../../lib/gatewayd_client');
var config = require(__dirname+'/../../config/config.js');
var Promise = require('bluebird');
var Transactions = require(__dirname+'/../data/models/ripple_transactions');

function EnqueueOutgoingPayments (botInstance){
  this.botInstance = botInstance;
  this._gatewaydClient = new GatewaydClient({
    gateway_url: botInstance.gatewayd_url,
    username: botInstance.username,
    password: botInstance.key
  });
}

EnqueueOutgoingPayments.prototype = {
  run: function(callback) {
    var _this = this;
    _this._loop(callback);
  },
  _loop: function(callback) {
    var _this = this;
    setTimeout(function() {
      _this._enqueuePayment(callback);
    }, _this.botInstance.interval);
  },
  _enqueuePayment: function(callback){
    var _this = this;
    _this._buildPayment()
      .then(function(payment){
        return _this._enqueuePaymentPayment(payment);
      })
      .then(function(transaction) {
        return _this._recordTransaction(transaction);
      })
      .then(function(enqueuedPayment){
        return _this._updateBotInstance(enqueuedPayment);
      })
      .then(function(botInstance) {
        callback(null, botInstance);
        console.log('num_times: ', botInstance.dataValues.payment_sent_count, ' out of ', botInstance.dataValues.payment_target_count, '. every ', _this.botInstance.interval, ' milliseconds.');
      })
      .catch(function(error) {
        callback(error);
        console.log('caught error', error);
      });
  },
  _buildPayment: function() {
    var _this = this;
    var amount;
    var destinationTag;
    var paymentObject = {};

    if (!_this.botInstance.amount) {
      amount = function () {
        return Math.random() / 1000
      }();
    }

    if (!_this.botInstance.destination_tag) {
      destinationTag = function () {
        return (Math.floor((Math.random() * 100) + 1)).toString();
      }();
    }

    paymentObject.currency = _this.botInstance.currency;
    paymentObject.address = _this.botInstance.to_account;
    paymentObject.amount = amount || _this.botInstance.amount;
    paymentObject.destinationTag = destinationTag || _this.botInstance.destination_tag;
    paymentObject.to_issuer = _this.botInstance.to_account;
    paymentObject.from_address_id = 2;
    paymentObject.to_address_id = 1;
    paymentObject.invoice_id = _this.botInstance.bot_invoice;
    paymentObject.from_amount = amount || _this.botInstance.amount;
    paymentObject.from_currency = amount || _this.botInstance.currency;
    paymentObject.to_amount = _this.botInstance.amount;
    paymentObject.to_currency = _this.botInstance.currency;
    
    console.log('payment', paymentObject);
    return new Promise(function(resolve, reject) {
      resolve(paymentObject);
    });
  },
  _enqueuePaymentPayment: function(paymentObject) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this._gatewaydClient.enqueueOutgoingPayment(paymentObject)
        .then(function(enqueuedPayment) {
          console.log('sent:', enqueuedPayment.body);
          resolve(enqueuedPayment.body.payment);
        })
        .error(reject);
    });
  },
  _recordTransaction: function (transaction) {
//    var _this = this;
    transaction.from_amount = transaction.to_amount;
    transaction.from_currency = transaction.to_currency;
    return new Promise(function(resolve, reject) {
      Transactions.create(transaction)
      .then(resolve)
      .error(reject);
    });
  },
  _updateBotInstance: function(payment) {
    var _this = this;
    if (payment) {
      return new Promise(function(resolve, reject) {
          if (_this.botInstance.payment_sent_count < _this.botInstance.payment_target_count) {
            _this.botInstance.payment_sent_count++;
            _this.botInstance.save().complete(function(error, botInstance) {
              if (error) {
                reject(error);
              } else {
                resolve(botInstance);
              }
            });
          } else {
            _this.botInstance.state = 'completed';
            _this.botInstance.save().complete(function(error, botInstance) {
              console.log(botInstance.dataValues.bot_type + ' bot #', botInstance.dataValues.id, ' complete!');
              if (error) {
                reject(error);
              } else {
                resolve(botInstance);
              }
            });
          }
      });
    }
  }
};

module.exports = EnqueueOutgoingPayments;
