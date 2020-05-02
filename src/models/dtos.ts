
import { f, PropertyValidatorError } from '@marcj/marshal';
import 'reflect-metadata';

export enum DimCommand {
    DIM = "DIM",
    PAUSE = "PAUSE",
    RESET = "RESET"
}

export class DimConfigUpdate {
    @f.type(Number).optional()
    eventInterval?: number;
    @f.type(Number).optional()
    steps?: number;
    @f.type(Number).optional()
    maxValue?: number;
    @f.type(Number).optional()
    minValue?: number;
}

export class DimCommandMessage {
    @f.enum(DimCommand, true)
    command: DimCommand = DimCommand.DIM;
    @f.type(Number).optional()
    @f.validator((value: any) => {
        if (value !== undefined && (value < 0.0 || value > 1.0)) {
            return new PropertyValidatorError('target', 'value needs to be in [0,1]');
        }
    })
    target?: number;
    @f.type(DimConfigUpdate).optional()
    config?: DimConfigUpdate;
}

export class InputMessage {
    @f.type(DimCommandMessage)
    payload: DimCommandMessage;
}
