import { createConfig } from 'fuels';

export default createConfig({
  contracts: [
      '../AMM/AMM-contract',
      '../AMM/atomic-add-liquidity',
      '../AMM/exchange-contract',
      '../AMM/test-token',
  ],
  output: './src/sway-api',
  providerUrl: 'https://testnet.fuel.network/v1/graphql',
  privateKey: '0x...',
});

/**
 * 此文件私钥在git上commit过，千万别直接提交给github
 */
