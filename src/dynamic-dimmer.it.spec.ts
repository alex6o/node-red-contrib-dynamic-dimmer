import * as helper from "node-red-node-test-helper"
import * as dynamicDimmer from "./dynamic-dimmer"
import { DimCommand } from './models/dtos';

helper.init(require.resolve('node-red'));

describe('integration of the dynamic dimmer node', () => {

    const STEPS = 10;
    const flow = [{
        id: "n1",
        type: "dynamic-dimmer",
        name: "my-test-name",
        eventInterval: 20,
        steps: STEPS,
        minValue: 0,
        maxValue: 100,
        wires: [["n2"]]
    },
    { id: "n2", type: "helper" }
    ];

    afterEach(() => {
        return helper.unload();
    });

    test('should load the node with specified values', (done) => {
        const flow = [{
            id: "n1",
            type: "dynamic-dimmer",
            name: "my-test-name",
            eventInterval: 512,
            steps: 32,
            minValue: 128,
            maxValue: 255
        }];
        helper.load(dynamicDimmer, flow, () => {
            const n1 = helper.getNode("n1") as any;
            expect(n1.name).toBe('my-test-name');
            expect(n1.config.eventInterval).toBe(512);
            expect(n1.config.steps).toBe(32);
            expect(n1.config.minValue).toBe(128);
            expect(n1.config.maxValue).toBe(255);
            done();
        });
    });

    test('should dim up', (done) => {

        expect.assertions(STEPS + 1);

        helper.load(dynamicDimmer, flow, () => {
            const n1 = helper.getNode("n1") as any;
            const n2 = helper.getNode("n2") as any;
            let responseCount = 0;

            n2.on("input", (msg: any) => {
                expect(msg.payload).toEqual(expect.any(Number));
                responseCount++;

                if (responseCount == STEPS) {
                    expect(Math.round(msg.payload)).toBe(100);
                    done();
                }
            });
            n1.receive({ payload: 1 });
        });
    });


    test('should dim up and down', (done) => {

        expect.assertions((STEPS * 2) + 1);

        helper.load(dynamicDimmer, flow, () => {
            const n1 = helper.getNode("n1") as any;
            const n2 = helper.getNode("n2") as any;
            let responseCount = 0;

            n2.on("input", (msg: any) => {
                expect(msg.payload).toEqual(expect.any(Number));
                responseCount++;

                if (responseCount == STEPS) {
                    n1.receive({ payload: 0 });
                }
                if (responseCount == STEPS * 2) {
                    expect(Math.round(msg.payload)).toBe(0);
                    done();
                }
            });
            n1.receive({ payload: 1 });
        });
    });


    test('should dim up, pause and reset', (done) => {

        expect.assertions(3);

        helper.load(dynamicDimmer, flow, () => {
            const n1 = helper.getNode("n1") as any;
            const n2 = helper.getNode("n2") as any;
            let responseCount = 0;

            n2.on("input", (msg: any) => {
                responseCount++;

                if (responseCount == STEPS / 2) {
                    expect(Math.round(msg.payload)).toBe(50);
                    n1.receive({ payload: { command: DimCommand.PAUSE.toString() } });
                }
                if (responseCount == (STEPS / 2) + 1) {
                    expect(Math.round(msg.payload)).toBe(50);
                    n1.receive({ payload: { command: DimCommand.RESET.toString() } });
                }
                if (responseCount == (STEPS / 2) + 2) {
                    expect(Math.round(msg.payload)).toBe(0);
                    done();
                }
            });
            n1.receive({ payload: 1 });
        });
    });
});
