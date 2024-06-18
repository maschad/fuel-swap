import { Account, arrayify, AssetId, BytesLike, chunkAndPadBytes, ContractFactory, hexlify } from "fuels";
import { calcRoot } from "@fuel-ts/merkle";
import { AMMContractAbi, AMMContractAbi__factory, ExchangeContractAbi, ExchangeContractAbi__factory } from "./sway-api";
import { join } from "path";
import { readFileSync } from "fs";

export const getContractRoot = (bytecode: BytesLike): string => {
    const chunkSize = 16 * 1024;
    const bytes = arrayify(bytecode);
    const chunks = chunkAndPadBytes(bytes, chunkSize);

    return calcRoot(chunks.map((c) => hexlify(c)));
};

export const deploy_amm_contract = async (wallet: Account) => {
    const bytecodeDir = join(__dirname, '../../AMM/AMM-contract/out/debug/AMM-contract.bin')
    console.log(bytecodeDir)
    const bytecode = readFileSync(bytecodeDir)
    const factory = new ContractFactory(bytecode, AMMContractAbi__factory.abi, wallet)
    let contractAbi = await factory.deployContract()
    console.log(contractAbi.id.toB256())

    return contractAbi as AMMContractAbi
}

export const initialize_amm_contract = async (amm_contract: AMMContractAbi) => {
    const bytecodeDir = join(__dirname, '../../AMM/exchange-contract/out/debug/exchange-contract.bin')
    console.log(bytecodeDir)
    const bytecode = readFileSync(bytecodeDir)
    let root = getContractRoot(bytecode)
    console.log('bytecodeRoot', root)

    await amm_contract.functions.initialize({ bits: root }).call()
}

export const deploy_pool_contract = async (wallet: Account, assetIdA: string, assetIdB: string) => {
    const bytecodeDir = join(__dirname, '../../AMM/exchange-contract/out/debug/exchange-contract.bin')
    const storageSlotsDir = join(__dirname, '../../AMM/exchange-contract/out/debug/exchange-contract-storage_slots.json')
    console.log(bytecodeDir)
    const bytecode = readFileSync(bytecodeDir)
    const storageSlots = JSON.parse(readFileSync(storageSlotsDir, 'utf-8'))
    const factory = new ContractFactory(bytecode, ExchangeContractAbi__factory.abi, wallet)
    let contractAbi = await factory.deployContract({ storageSlots })

    console.log(contractAbi.id.toB256())

    //let pool_info = await contractAbi.functions.pool_info().simulate()
    //console.log(pool_info)

    //await contractAbi.functions.test1({bits: assetIdA}, {bits: assetIdB}).call()
    //await contractAbi.functions.test2({bits: assetIdA}, {bits: assetIdB}).call()

    //await contractAbi.functions.constructor({bits: assetIdA}, {bits: assetIdB}).call()

    return contractAbi as ExchangeContractAbi
}