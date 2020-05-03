import { InputMessage, DimCommandMessage, DimConfigUpdate as DimConfigUpdateDTO } from '../models/dtos';
import { validatedPlainToClass } from '@marcj/marshal';
import { DimConfigUpdate } from '../models/dim';

function convertTargetValueInput(input: any): any {
    if ("payload" in input) {
        if (typeof input.payload === "number") {
            const msg = new InputMessage();
            msg.payload = new DimCommandMessage()
            msg.payload.target = parseFloat(input.payload);
            return msg;
        }
    }
    return input;
}

export function convertInput(rawMsg: any): InputMessage {
    const msg = convertTargetValueInput(rawMsg);
    return validatedPlainToClass(InputMessage, msg)
}


export function convertDimConfigUpdate(newConfig: DimConfigUpdateDTO): DimConfigUpdate {
    const config: DimConfigUpdate = Object.assign({}, newConfig);
    if (newConfig !== undefined) {
        if ("steps" in newConfig) {
            config.step = 1.0 / newConfig.steps;
        }
    }
    return config;
}
