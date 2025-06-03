$(document).ready(function() {
  // Check if wallets are defined in HTML or need to be fetched from backend
  const walletsContainer = $('#wallets');
  const walletsInHtml = $('.wallet').length > 0;

  if (walletsInHtml) {
    // Wallets are hardcoded in HTML
    $('.wallet').each(function() {
      const wallet = $(this);
      const currency = wallet.data('currency');
      const address = wallet.data('address');
      renderWallet(wallet, currency, address);
    });
  } else {
    // Fetch wallets from backend
    $.get('/api/wallets', function(wallets) {
      wallets.forEach(wallet => {
        const walletHtml = `
          <div class="wallet" data-currency="${wallet.currency}" data-address="${wallet.address}">
            <h2>${wallet.currency.toUpperCase()}</h2>
            <p>Address: <span class="address-text">${wallet.address}</span>
              <button onclick="copyAddress('${wallet.address}')">Copy</button>
            </p>
            <div class="qrcode"></div>
            <div class="transactions"><p>Loading transactions...</p></div>
          </div>
        `;
        walletsContainer.append(walletHtml);
        const walletElement = walletsContainer.find(`[data-address="${wallet.address}"]`);
        renderWallet(walletElement, wallet.currency, wallet.address);
      });
    }).fail(function() {
      walletsContainer.html('<p>Failed to load wallets.</p>');
    });
  }

  // Function to render QR code and transactions for a wallet
  function renderWallet(walletElement, currency, address) {
    const transactionContainer = walletElement.find('.transactions');
    const qrDiv = walletElement.find('.qrcode')[0];

    // Generate QR code
    const uri = currency === 'btc' ? `bitcoin:${address}` : `ethereum:${address}`;
    new QRCode(qrDiv, {
      text: uri,
      width: 128,
      height: 128
    });

    // Fetch transactions
    $.get(`/api/transactions/${currency}/${address}`, function(res) {
      let html = `<h3>Recent Donations (${res.currency.toUpperCase()})</h3><ul>`;
      if (res.transactions && res.transactions.length > 0) {
        res.transactions.forEach(tx => {
          let amount;
          if (res.currency === 'btc') {
            amount = formatCryptoAmount(tx.amount / 100000000, res.currency);
          } else if (res.currency === 'eth') {
            amount = formatCryptoAmount(parseFloat(tx.amount) / 1e18, res.currency);
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
