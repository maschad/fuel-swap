# fuel-swap playground

### build
```js
cd AMM
forc build

cd Play-Ground
yarn
```

### typegen
```js
cd Play-Ground
npx fuels build
```

### token play-ground
```js
yarn start --task=deployToken             // deploy token

yarn start --task=setUSD                  // create USD token for test
yarn start --task=mintUSD                 // mint USD token to owner address
yarn start --task=sendUSD --to fuelxxx    // send USD token from owner address

yarn start --task=setBTC                  // create BTC token for test
yarn start --task=mintBTC                 // mint BTC token to owner address
yarn start --task=sendBTC --to fuelxxx    // send BTC token from owner address
```

### amm play-ground
```js
yarn start --task=deployAMM               // deploy amm contract
yarn start --task=initAmm                 // init amm contract

yarn start --task=createPool              // create USD + BTC pool
yarn start --task=initPool                // init USD + BTC pool
```