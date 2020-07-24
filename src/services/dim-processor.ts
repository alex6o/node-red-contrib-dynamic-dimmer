import { interval, Observable, of, combineLatest, SchedulerLike, Subject } from 'rxjs';
import { map, takeWhile, takeUntil } from 'rxjs/operators';
import { easeLinear } from 'd3-ease';

import * as math from 'mathjs';
import { DimConfig, DimConfigUpdate, DimContext } from '../models/dim';

const ROUNDING_DECIMALS = 3;

export class DimProcessor {
    private currentValue: number;
    private t: number;
    private timeSequence$: Observable<number>;
    private easeFn: (x: number) => number;
    private dimStopSignal$: any = new Subject();
    private defaultConfig: DimConfig;


    constructor(
        private config: DimConfig,
        private scheduler?: SchedulerLike,
    ) {
        this.config = Object.assign({
            eventInterval: 200,
            minValue: 0,
            maxValue: 100,
            step: 0.1
        }, config);
        this.defaultConfig = Object.assign(config);

        this.currentValue = this.config.minValue;
        this.t = 0;
        this.timeSequence$ = interval(this.config.eventInterval, this.scheduler);
        this.easeFn = easeLinear;
    }

    public dim(target: number, config?: DimConfigUpdate): Observable<number> {

        this.mergeDimConfig(config);

        // cancel existing streams
        this.stopDimProcessing();
        this.dimStopSignal$ = new Subject();

        const context: DimContext = Object.assign(
            this.config,
            {
                currentValue: this.currentValue,
                t: this.t,
                target: target,
                sign: (target < this.t) ? -1.0 : 1.0,
                easeFn: this.easeFn
            });

        const targetNotReached = (target: number, t: number, targetSign: number): boolean => {
            return (targetSign === 1.0) ? t <= target : t >= target;
        }

        return combineLatest(this.timeSequence$, of(context), (t, c) => c)
            .pipe(
                map(c => {
                    c.t = c.t + (c.sign * c.step);
                    c.currentValue = math.chain(c.easeFn(c.t))
                        .multiply(c.maxValue)
                        .round(ROUNDING_DECIMALS)
                        .done();
                    return c;
                }),
                takeWhile(c => targetNotReached(c.target, c.t, c.sign)),
                takeUntil(this.dimStopSignal$),
                map(c => {
                    // clamp values
                    c.currentValue = Math.max(Math.min(c.maxValue, c.currentValue), c.minValue);
                    c.t = Math.max(Math.min(1.0, c.t), 0.0);
                    // update global state
                    this.currentValue = c.currentValue;
                    this.t = c.t;
                    return c.currentValue;
                })
            );
    }

    private stopDimProcessing(): void {
        this.dimStopSignal$.next();
        this.dimStopSignal$.complete();
    }

    public pause(): Observable<number> {
        this.stopDimProcessing();
        return of(this.currentValue);
    }


    public set(target: number, config?: DimConfigUpdate): Observable<number> {

        this.mergeDimConfig(Object.assign(this.defaultConfig, config));
        this.stopDimProcessing();

        const context: DimContext = Object.assign(
            this.config,
            {
                currentValue: this.currentValue,
                t: target,
                target: target,
                sign: 1.0,
                easeFn: this.easeFn
            });


        return of(context)
            .pipe(
                map(c => {
                    c.currentValue = math.chain(c.easeFn(c.t))
                        .multiply(c.maxValue)
                        .round(ROUNDING_DECIMALS)
                        .done();
                    
                    c.currentValue = Math.max(Math.min(c.maxValue, c.currentValue), c.minValue);
                    
                    // update global state
                    this.currentValue = c.currentValue;
                    this.t = c.t;
                    return this.currentValue;
                })
            );
    }

    public reset(config?: DimConfigUpdate): Observable<number> {
        return this.set(0.0, config);
    }

    private mergeDimConfig(newConfig: DimConfigUpdate): void {
        if (newConfig !== undefined) {
            this.config = Object.assign(this.config, newConfig);
            // clamp currentValue within new bounds
            this.currentValue = Math.min(Math.max(this.currentValue, this.config.minValue), this.config.maxValue);
            // TODO: find approach to remap t depending on the easing function
            this.timeSequence$ = interval(this.config.eventInterval, this.scheduler);
        }
    }
}


export class DimProcessorFactory {
    public static getProcessor(config: DimConfig): DimProcessor {
        return new DimProcessor(config);
    }
}
