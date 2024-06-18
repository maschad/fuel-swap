import { AMMContractAbi__factory, ExchangeContractAbi__factory, NativeAssetContractAbi__factory } from "./sway-api"
import { config } from "dotenv";
import {
    bn,
    BN,
    Account,
    Provider,
    Wallet,
    Address,
    getMintedAssetId,
    formatUnits,
    isBech32,
    isPublicKey,
    toBech32, AbstractAddress
} from "fuels";
config({ path: ".env" });
import {
    deploy_token_contract,
    get_asset_id_by_contract_id,
    parseUnits,
    set_token_metadata,
    show_token_metadata
} from "./tokenHelper";
import { loadConfig, saveConfig } from "./config";
import { deploy_amm_contract, deploy_pool_contract, initialize_amm_contract } from "./ammHelper";

const args = require('minimist')(process.argv.slice(2), {
    string: ['task', 'to'],
    boolean: ['loop'],
    number: ['amount']
})

const CONFIG_PATH = 'config.json'
const USD_ASSET_ID = bn(0).toHex(32)
const BTC_ASSET_ID = bn(1).toHex(32)

export default async function main() {
    const provider = await Provider.create("https://testnet.fuel.network/v1/graphql");
    const task = args.task
    const secret = process.env.SECRET_KEY
    const wallet = secret.startsWith('0x') ?
        Wallet.fromPrivateKey(secret) : Wallet.fromMnemonic(process.env.SECRET_KEY, "m/44'/1179993420'/0'/0/0");
    wallet.connect(provider)
    const balances = await wallet.getBalances();
    console.log(wallet.address.toAddress())
    for (let balance of balances) {
        console.log(balance.assetId, balance.amount.toString())
    }

    let config = loadConfig(CONFIG_PATH)

    if (task == 'deployToken') {
        if (config.tokenContract) {
            console.log('token contract deploy already')
            return
        }

        let tokenContract = await deploy_token_contract(wallet, '0xffffffffffffffff')
        config['tokenContract'] = tokenContract.id.toB256()
        saveConfig(config, CONFIG_PATH)
    }

    if (task == 'setUSD') {
        await setToken(config, wallet, USD_ASSET_ID, 'test USD', 'tUSD', 6)
    }

    if (task == 'mintUSD') {
        await mintToken(config, wallet, USD_ASSET_ID, parseUnits('1000000', 6), wallet)
    }

    if (task == 'setBTC') {
        await setToken(config, wallet, BTC_ASSET_ID, 'test BTC', 'tBTC', 10)
    }

    if (task == 'mintBTC') {
        await mintToken(config, wallet, BTC_ASSET_ID, parseUnits('100', 10), wallet)
    }

    if (task == 'sendUSD') {
        await transferToken(config, wallet, USD_ASSET_ID, args.amount, args.to)
    }

    if (task == 'sendBTC') {
        await transferToken(config, wallet, BTC_ASSET_ID, args.amount, args.to)
    }

    if (task == 'deployAMM') {
        if (config.ammContract) {
            console.log('token contract deploy already')
            return
        }

        let amm = await deploy_amm_contract(wallet)
        config['ammContract'] = amm.id.toB256()
        saveConfig(config, CONFIG_PATH)
    }

    if (task == 'initAMM') {
        if (!config.ammContract) {
            console.log('deploy amm contract first')
            return
        }
        let amm = AMMContractAbi__factory.connect(config.ammContract, wallet)
        await initialize_amm_contract(amm)
    }

    if (task == 'createPool') {
        if (!config.tokenContract || !config.ammContract) {
            console.log('deploy token and amm contract first')
            return
        }
        let assetId1 = getMintedAssetId(config.tokenContract, USD_ASSET_ID)
        let assetId2 = getMintedAssetId(config.tokenContract, BTC_ASSET_ID)

        let pools = config['pools'] ?? {}
        if (pools[assetId1] && pools[assetId1][assetId2]) {
            console.log('pool already exists')
            return
        }

        let pool = await deploy_pool_contract(wallet, assetId1, assetId2)

        pools[assetId1] = pools[assetId1] ?? {}
        pools[assetId2] = pools[assetId2] ?? {}

        pools[assetId1][assetId2] = pool.id.toB256()
        pools[assetId2][assetId1] = pool.id.toB256()

        config['pools'] = pools
        saveConfig(config, CONFIG_PATH)
    }

    if (task == 'initPool') {
        let assetId1 = getMintedAssetId(config.tokenContract, USD_ASSET_ID)
        let assetId2 = getMintedAssetId(config.tokenContract, BTC_ASSET_ID)
        if (!config.pools[assetId1][assetId2]) {
            console.log('create pool first')
            return
        }

        let poolContract = ExchangeContractAbi__factory.connect(config.pools[assetId1][assetId2], wallet)
        await poolContract.functions.constructor({ bits: assetId1 }, { bits: assetId2 }).call()
        console.log('init pool done')
    }

    if (task == 'test1') {
        let assetId1 = getMintedAssetId(config.tokenContract, USD_ASSET_ID)
        let assetId2 = getMintedAssetId(config.tokenContract, BTC_ASSET_ID)
        if (!config.pools[assetId1][assetId2]) {
            console.log('create pool first')
            return
        }

        let poolContract = ExchangeContractAbi__factory.connect(config.pools[assetId1][assetId2], wallet)
        await poolContract.functions.test1().simulate()
        console.log('test1 done')
    }

    if (task == 'test2') {
        let assetId1 = getMintedAssetId(config.tokenContract, USD_ASSET_ID)
        let assetId2 = getMintedAssetId(config.tokenContract, BTC_ASSET_ID)
        if (!config.pools[assetId1][assetId2]) {
            console.log('create pool first')
            return
        }

        let poolContract = ExchangeContractAbi__factory.connect(config.pools[assetId1][assetId2], wallet)
        await poolContract.functions.test2().simulate()
        console.log('test2 done')
    }

    if (task == 'test3') {
        let assetId1 = getMintedAssetId(config.tokenContract, USD_ASSET_ID)
        let assetId2 = getMintedAssetId(config.tokenContract, BTC_ASSET_ID)
        if (!config.pools[assetId1][assetId2]) {
            console.log('create pool first')
            return
        }

        let poolContract = ExchangeContractAbi__factory.connect(config.pools[assetId1][assetId2], wallet)
        await poolContract.functions.test3().call()
        console.log('test3 done')

        let pool_info = await poolContract.functions.pool_info().simulate()
        console.log(pool_info)
    }

    {
        if (!config.tokenContract) {
            console.log('deploy token contract first')
            return
        }

        let tokenContract = NativeAssetContractAbi__factory.connect(config.tokenContract, wallet)
        let defaultAssetId1 = get_asset_id_by_contract_id(config.tokenContract, USD_ASSET_ID)
        let defaultAssetId2 = get_asset_id_by_contract_id(config.tokenContract, BTC_ASSET_ID)
        await show_token_metadata(tokenContract, defaultAssetId1)
        await show_token_metadata(tokenContract, defaultAssetId2)
    }

    console.log(config)
}

const transferToken = async (config: any, wallet: Account, subId: string, amount: number, to: string) => {
    if (!config.tokenContract) {
        console.log('deploy token contract first')
        return
    }

    if (!amount) {
        console.log('invalid amount')
        return
    }

    if (!isBech32(to)) {
        console.log('invalid address')
        return
    }

    let toAddress = Address.fromAddressOrString(to)
    let tokenContract = NativeAssetContractAbi__factory.connect(config.tokenContract, wallet)
    let assetId = getMintedAssetId(config.tokenContract, subId)
    let { value: decimals } = await tokenContract.functions.decimals({ bits: assetId }).simulate()
    let balance = await wallet.getBalance(assetId)
    let amountSend = parseUnits(amount.toString(), decimals)
    console.log('balance', balance.toString(), 'amount', amountSend.toString())
    if (balance.lte(amountSend)) {
        console.log('balance not enough')
        return
    }

    let tr = await wallet.transfer(toAddress, amountSend, assetId)
    let result = await tr.wait()
    console.log('tx', result.id)
}

const mintToken = async (config: any, wallet: Account, subId: string, amount: BN, to: Account) => {
    if (!config.tokenContract) {
        console.log('deploy token contract first')
        return
    }
    to = to ?? wallet
    let tokenContract = NativeAssetContractAbi__factory.connect(config.tokenContract, wallet)
    let result = await tokenContract.functions.mint({ Address: { bits: to.address.toB256() } },
        subId,
        amount).call()
    console.log(result.transactionResult.mintedAssets[0])
}

const setToken = async (config: any, wallet: Account | Provider, subId: string, name: string, symbol: string, decimals: number) => {
    if (!config.tokenContract) {
        console.log('deploy token contract first')
        return
    }

    let tokenContract = NativeAssetContractAbi__factory.connect(config.tokenContract, wallet)
    let queryAssetId = getMintedAssetId(config.tokenContract, subId)
    if (await set_token_metadata(tokenContract, queryAssetId, name, symbol, decimals)) {
        let tokens = config['tokens'] ?? []
        tokens.push({
            assetId: queryAssetId,
            subId,
            name,
            symbol,
            decimals
        })
        config['tokens'] = tokens
        saveConfig(config, CONFIG_PATH)
    }
}

main().then()