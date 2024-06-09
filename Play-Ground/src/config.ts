import {readFileSync, writeFileSync} from "fs"

export const loadConfig = (path: string): any =>{
    try {
        let config = JSON.parse(readFileSync(path).toString())
        return config
    } catch (e) {
        return {}
    }
}

export const saveConfig = (config: any, path: string) =>{
    writeFileSync(path, JSON.stringify(config, null, '    '))
}

export const stringifyObj = (obj: any) : string => {
    return JSON.stringify(obj, null, '    ')
}