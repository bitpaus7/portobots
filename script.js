const NEYNAR_API_KEY = 'YOUR_NEYNAR_API_KEY_HERE'; // Ganti dengan API key kamu
const ZAPPER_API_KEY = 'YOUR_ZAPPER_API_KEY_HERE'; // Opsional, daftar di zapper.xyz untuk LP/Staking

async function fetchPortfolio() {
    const fid = document.getElementById('fidInput').value;
    if (!fid) {
        alert('Masukkan FID!');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('portfolio').style.display = 'none';

    try {
        // Fetch dari Neynar: User Balance (token balances per address)
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/balance?fid=${fid}`, {
            headers: {
                'api_key': NEYNAR_API_KEY
            }
        });
        const data = await response.json();

        if (data.user_balance) {
            let allTokens = [];
            let totalValue = 0;

            // Kumpulkan semua token dari semua address
            data.user_balance.address_balances.forEach(addr => {
                if (addr.token_balances) {
                    allTokens = allTokens.concat(addr.token_balances);
                }
            });

            // Sort 5 teratas berdasarkan nilai USDC
            const top5 = allTokens
                .sort((a, b) => parseFloat(b.balance.in_usdc) - parseFloat(a.balance.in_usdc))
                .slice(0, 5);

            // Hitung total
            totalValue = allTokens.reduce((sum, token) => sum + parseFloat(token.balance.in_usdc || 0), 0);

            // Tampilkan top 5 tokens
            const tokenList = document.getElementById('topTokens');
            tokenList.innerHTML = '';
            top5.forEach(token => {
                const li = document.createElement('li');
                li.innerHTML = `${token.token.symbol}: ${token.balance.in_token} (~$${token.balance.in_usdc})`;
                tokenList.appendChild(li);
            });

            document.getElementById('totalValue').textContent = totalValue.toFixed(2);

            // Fetch LP & Staking via Zapper (contoh untuk address utama; ambil dari data.address_balances[0].verified_address.address)
            const mainAddress = data.user_balance.address_balances[0]?.verified_address?.address;
            if (mainAddress && ZAPPER_API_KEY) {
                const zapperResponse = await fetch(`https://api.zapper.xyz/v2/balances?addresses[]=${mainAddress}`, {
                    headers: { 'Authorization': `Bearer ${ZAPPER_API_KEY}` }
                });
                const zapperData = await zapperResponse.json();
                
                // Estimasi LP (sum dari liquidity positions)
                const lpValue = zapperData.balances.filter(b => b.type === 'liquidity-position').reduce((sum, b) => sum + (b.balanceUSD || 0), 0);
                document.getElementById('lpBalance').textContent = `$${lpValue.toFixed(2)}`;

                // Estimasi Staking (sum dari staking rewards/positions, misal Lido ETH)
                const stakingValue = zapperData.balances.filter(b => b.appId.includes('staking') || b.token.symbol === 'stETH').reduce((sum, b) => sum + (b.balanceUSD || 0), 0);
                document.getElementById('stakingBalance').textContent = `$${stakingValue.toFixed(2)}`;
            } else {
                document.getElementById('lpBalance').textContent = '$0 (Setup Zapper API untuk detail)';
                document.getElementById('stakingBalance').textContent = '$0 (Setup Zapper API untuk detail)';
            }

            document.getElementById('portfolio').style.display = 'block';
        } else {
            alert('Data tidak ditemukan. Cek FID atau API key.');
        }
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    }

    document.getElementById('loading').style.display = 'none';
}