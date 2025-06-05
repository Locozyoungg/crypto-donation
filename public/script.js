$(document).ready(function() {
  // Process hardcoded wallets in HTML
  $('.wallet').each(function() {
    const wallet = $(this);
    const currency = wallet.data('currency');
    const address = wallet.data('address');
    const network = wallet.data('network'); // For USDT
    renderWallet(wallet, currency, address, network);
  });

  // Function to render QR code and transactions for a wallet
  function renderWallet(walletElement, currency, address, network) {
    const transactionContainer = walletElement.find('.transactions');
    const qrDiv = walletElement.find('.qrcode')[0];

    // Generate QR code based on currency
    let uri;
    switch (currency.toLowerCase()) {
      case 'btc':
        uri = `bitcoin:${address}`;
        break;
      case 'eth':
      case 'usdt':
        uri = `ethereum:${address}${network ? `?network=${network}` : ''}`;
        break;
      case 'sol':
        uri = `solana:${address}`;
        break;
      case 'bnb':
        uri = `binance:${address}`;
        break;
      default:
        uri = address; // Fallback for unsupported currencies
    }
    new QRCode(qrDiv, {
      text: uri,
      width: 128,
      height: 128
    });

    // Fetch transactions (will fail locally without a backend)
    $.get(`/api/transactions/${currency}/${address}`, function(res) {
      let html = `<h3>Recent Donations (${res.currency.toUpperCase()})</h3><ul>`;
      if (res.transactions && res.transactions.length > 0) {
        res.transactions.forEach(tx => {
          let amount;
          if (currency === 'btc') {
            amount = formatCryptoAmount(tx.amount / 100000000, currency);
          } else if (currency === 'eth' || currency === 'usdt') {
            amount = formatCryptoAmount(parseFloat(tx.amount) / 1e18, currency);
          } else if (currency === 'sol') {
            amount = formatCryptoAmount(parseFloat(tx.amount) / 1e9, currency);
          } else if (currency === 'bnb') {
            amount = formatCryptoAmount(parseFloat(tx.amount) / 1e18, currency);
          } else {
            amount = formatCryptoAmount(tx.amount, currency);
          }
          const date = new Date(tx.timestamp).toLocaleString();
          html += `<li>${amount} at ${date}</li>`;
        });
      } else {
        html += '<li>No recent donations.</li>';
      }
      html += '</ul>';
      transactionContainer.html(html);
    }).fail(function() {
      transactionContainer.html('<p>Failed to load transactions.</p>');
    });
  }
});

// Copy address to clipboard
function copyAddress(address) {
  navigator.clipboard.writeText(address)
    .then(() => alert('Address copied to clipboard!'))
    .catch(err => console.error('Failed to copy:', err));
}

// Format crypto amounts
function formatCryptoAmount(amount, currency) {
  let amountStr;
  if (amount === 0) {
    amountStr = '0';
  } else {
    amountStr = amount.toFixed(8);
    if (amountStr.includes('.')) {
      amountStr = amountStr.replace(/0+$/, '').replace(/\.$/, '');
    }
  }
  return `${amountStr} ${currency.toUpperCase()}`;
}
