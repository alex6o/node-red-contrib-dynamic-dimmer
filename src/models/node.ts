import { NodeDef } from 'node-red';
import { ValidationError } from '@marcj/marshal';

export interface NodeConfig extends NodeDef {
    name: string;
    eventInterval: number;
    steps: number;
    maxValue: number;
    minValue: number;
}

export class InputValidationError extends Error {
    constructor(message: string, private errors: ValidationError[]) {
        super(message);
    }
    public toString = (): string => {
        return `${this.message} ${JSON.stringify(this.errors)}`;
    }
}
