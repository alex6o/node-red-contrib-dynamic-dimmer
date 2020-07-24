import { DimProcessor } from './dim-processor';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { DimConfig } from '../models/dim';

describe('test behavior of dim processor', () => {
    const dimConfig: DimConfig = {
        eventInterval: 2,
        maxValue: 100,
        minValue: 0,
        step: 1 / 4
    }
    let scheduler: TestScheduler;

    beforeEach(() => {
        jest.clearAllMocks();
        scheduler = new TestScheduler((actual, expected) => {
            expect(actual).toEqual(expected);
        });

    });

    test('should perform a dim up operation', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50, c: 75, d: 100 };
            const expectedMarble = '--a-b-c-d-|';

            expectObservable(dimProcessor.dim(1.0)).toBe(expectedMarble, expectedValues);
            done();
        });
    });

    test('should perform a dim up operation and pause', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        let pause$: Observable<number>;

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50 };
            const expectedMarble = '--a-|';

            expectObservable(
                dimProcessor.dim(1.0)
                    .pipe(tap(x => {
                        if (x == 50) {
                            // trigger a pause event in the middle of the dim operation
                            pause$ = dimProcessor.pause();
                        }
                    })))
                .toBe(expectedMarble, expectedValues);
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { b: 50 };
            const expectedMarble = '----(b|)'

            expectObservable(pause$).toBe(expectedMarble, expectedValues);
            done();
        });
    });


    test('should switch from a dim up to a dim down operation', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        let down$: Observable<number>;

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50, c: 75 };
            const expectedMarble = '--a-b-|';

            expectObservable(
                dimProcessor.dim(1.0)
                    .pipe(tap(x => {
                        if (x == 75) {
                            // trigger a dim down event
                            down$ = dimProcessor.dim(0.0);
                        }
                    })))
                .toBe(expectedMarble, expectedValues);
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 0, b: 25, c: 50, d: 75 };
            const expectedMarble = '--------c-b-a-|';

            expectObservable(down$).toBe(expectedMarble, expectedValues);
            done();
        });
    });


    test('should completely dim up and then dim down', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50, c: 75, d: 100 };
            const expectedMarble = '--a-b-c-d-|';

            expectObservable(
                dimProcessor.dim(1.0))
                .toBe(expectedMarble, expectedValues);
            done();
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 0, b: 25, c: 50, d: 75 };
            const expectedMarble = '------------d-c-b-a-|';

            expectObservable(dimProcessor.dim(0.0)).toBe(expectedMarble, expectedValues);
            done();
        });
    });

    test('should switch to another dim up operation', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        let anotherDimUp$: Observable<number>;

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25 };
            const expectedMarble = '--a-|';

            expectObservable(
                dimProcessor.dim(1.0)
                    .pipe(tap(x => {
                        if (x == 50) {
                            // trigger another dimUp event
                            anotherDimUp$ = dimProcessor.dim(1.0);
                        }
                    })))
                .toBe(expectedMarble, expectedValues);
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { c: 75, d: 100 };
            const expectedMarble = '------c-d-|';

            expectObservable(anotherDimUp$).toBe(expectedMarble, expectedValues);
            done();
        });
    });


    test('should stop dim operation and reset to default settings', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        let reset$: Observable<number>;

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50, c: 75 };
            const expectedMarble = '--a-b-|';

            expectObservable(
                dimProcessor.dim(1.0)
                    .pipe(tap(x => {
                        if (x == 75) {
                            // trigger a reset event
                            reset$ = dimProcessor.reset();
                        }
                    })))
                .toBe(expectedMarble, expectedValues);
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 0 };
            const expectedMarble = '------(a|)';

            expectObservable(reset$).toBe(expectedMarble, expectedValues);
            done();
        });
    });


    test('should stop dim operation and set to specified settings', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);
        let reset$: Observable<number>;

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 25, b: 50, c: 75 };
            const expectedMarble = '--a-b-|';

            expectObservable(
                dimProcessor.dim(1.0)
                    .pipe(tap(x => {
                        if (x == 75) {
                            // trigger a set event
                            reset$ = dimProcessor.set(0.3);
                        }
                    })))
                .toBe(expectedMarble, expectedValues);
        });

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 30 };
            const expectedMarble = '------(a|)';

            expectObservable(reset$).toBe(expectedMarble, expectedValues);
            done();
        });
    });
    

    test('should reset to partially new settings', (done) => {
        const dimProcessor = new DimProcessor(dimConfig, scheduler);

        scheduler.run((helpers: any) => {
            const { expectObservable } = helpers;
            const expectedValues = { a: 50 };
            const expectedMarble = '(a|)';

            expectObservable(dimProcessor.reset({ minValue: expectedValues.a }))
                .toBe(expectedMarble, expectedValues);
            done();
        });
    });

});
