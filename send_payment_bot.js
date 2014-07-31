var PaymentBot = require(__dirname+'/bot_processes/payment');
var config = require(__dirname+'/config/config.js');

var paymentBot = new PaymentBot({
  from_account: config.get('FROM_ACCOUNT'),
  currency: config.get('CURRENCY'),
  secret: config.get('BOT_ACCOUNT_SECRET'),
  to_account: config.get('TO_ACCOUNT'),
  destination_tag: config.get('DESTINATION_TAG')
});

paymentBot.start();

console.log('### Sending payments to specified account  ###');