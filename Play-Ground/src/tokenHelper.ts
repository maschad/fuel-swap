import {Account, arrayify, bn, concat, ContractFactory, isB256, sha256} from "fuels";
import {NativeAssetContractAbi, NativeAssetContractAbi__factory} from "./sway-api";
import {join} from "path";
import {readFileSync} from "fs";
import {ethers} from "ethers";

export function parseUnits(value: string, decimals: number) {
    return bn(ethers.utils.parseUnits(value, decimals).toString())
}

export function get_asset_id_by_contract_id(contract_id: string, sub_id: string) {
    if (isB256(contract_id) && isB256(sub_id)) {
        const contractIdBytes = arrayify(contract_id);
        const subIdBytes = arrayify(sub_id);
        return sha256(concat([contractIdBytes, subIdBytes]));
    }

    throw new Error('invalid contract id or sub id')
}

export const set_token_metadata = async (token_contract: NativeAssetContractAbi,
                                  asset_id: string, name: string, symbol: string, decimals: number) => {
    const {value: owner} = await token_contract.functions.owner().simulate();
    console.log('owner', owner.Initialized?.Address.bits ?? '-', token_contract.account.address.toB256())
    if (owner.Uninitialized) {
        await token_contract.functions.constructor({Address: {bits: token_contract.account.address.toB256()}}).call();
    }

    let {value: metadataResult1} = await token_contract.multiCall([
        token_contract.functions.name({bits: asset_id}),
        token_contract.functions.symbol({bits:asset_id}),
        token_contract.functions.decimals({bits: asset_id})
    ]).simulate()
    if (metadataResult1[0] || metadataResult1[1] || metadataResult1[2]) {
        console.log('metadata set already', metadataResult1[0], metadataResult1[1], metadataResult1[2])
        return false
    }

    await token_contract.multiCall([
        token_contract.functions.set_name({bits: asset_id}, name),
        token_contract.functions.set_symbol({bits:asset_id}, symbol),
        token_contract.functions.set_decimals({bits: asset_id}, decimals)
    ]).call()

    let {value: metadataResult2} = await token_contract.multiCall([
        token_contract.functions.name({bits: asset_id}),
        token_contract.functions.symbol({bits:asset_id}),
        token_contract.functions.decimals({bits: asset_id})
    ]).simulate()

    console.log(metadataResult2[0], metadataResult2[1], metadataResult2[2])
    return true
}

export const show_token_metadata = async (token_contract: NativeAssetContractAbi, asset_id: string) => {
    let {value: metadataResult2} = await token_contract.multiCall([
        token_contract.functions.name({bits: asset_id}),
        token_contract.functions.symbol({bits: asset_id}),
        token_contract.functions.decimals({bits: asset_id})
    ]).simulate()

    console.log(asset_id, metadataResult2[0], metadataResult2[1], metadataResult2[2])
    return true
}

export const deploy_token_contract = async (wallet: Account, maxSupply?: string) => {
    const bytecodeDir = join(__dirname, '../../AMM/test-token/out/debug/native-asset-contract.bin')
    console.log(bytecodeDir)
    const bytecode = readFileSync(bytecodeDir)

    const configurableConstants = {
        MAX_SUPPLY: maxSupply,
    };
    const factory = new ContractFactory(bytecode, NativeAssetContractAbi__factory.abi, wallet)
    factory.setConfigurableConstants(configurableConstants)
    //let contractAbi = await factory.deployContract()
    const contractAbi = await NativeAssetContractAbi__factory.deployContract(bytecode, wallet,
    {configurableConstants})
    console.log(contractAbi.id.toB256())

    await contractAbi.functions.constructor({Address: {bits: wallet.address.toB256()}}).call();

    return contractAbi as NativeAssetContractAbi
}