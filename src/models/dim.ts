
export interface DimConfig {
    eventInterval: number;
    minValue: number;
    maxValue: number;
    step: number;
}

export interface DimConfigUpdate {
    eventInterval?: number;
    minValue?: number;
    maxValue?: number;
    step?: number;
}

export interface DimContext extends DimConfig {
    currentValue: number;
    t: number;
    target: number;
    sign: number;
    easeFn: (x: number) => number;
}
