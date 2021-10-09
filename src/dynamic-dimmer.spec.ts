import { DimConfig } from './models/dim';
import { DimCommand } from './models/dtos';
import { of } from 'rxjs';
import { DimProcessor, DimProcessorFactory } from './services/dim-processor';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dynamicDimmer = require("./dynamic-dimmer");
jest.mock("./services/dim-processor");

describe('dynamic dimmer node', () => {

    const nodeConfig = {
        name: "test-dimmer",
        eventInterval: 50,
        steps: 10,
        maxValue: 100,
        minValue: 0
    };
    const registeredTypes: Record<string, any> = {};
    const registeredListeners: Record<string, Function[]> = {};
    const REDMock = {
        nodes: {
            createNode: jest.fn((newNode, config) => {
                newNode.on = jest.fn((event: string, cb: Function) => {
                    if (registeredListeners[event] === undefined) {
                        registeredListeners[event] = [];
                    }
                    registeredListeners[event].push(cb);
                });
                newNode.warn = jest.fn();
                newNode.status = jest.fn();
                expect(config).toMatchObject(nodeConfig);
            }),
            registerType: jest.fn((typeName: string, constructor: Function) => {
                registeredTypes[typeName] = constructor;
            }),
        }
    };

    const dimConfig: DimConfig = {
        eventInterval: nodeConfig.eventInterval,
        maxValue: nodeConfig.maxValue,
        minValue: nodeConfig.minValue,
        step: 1 / nodeConfig.steps
    }
    let dimProcessor: DimProcessor;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let node: any;

    DimProcessorFactory.getProcessor = jest.fn().mockImplementation(() => {
        return dimProcessor
    });

    beforeAll(() => {
        dimProcessor = new DimProcessor(dimConfig, null);
        dynamicDimmer(REDMock);
        node = new registeredTypes['dynamic-dimmer'](nodeConfig);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function _sendMsg(payload: any, send: Function, done: Function): void {
        registeredListeners["input"].forEach(cb => cb({ payload }, send, done));
    }

    test('should trigger a dim up', (done) => {
        dimProcessor.dim = jest.fn().mockReturnValue(of(0, 50, 100));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ target: 1.0, command: DimCommand.DIM.toString() }, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(1);
        expect(dimProcessor.dim).toHaveBeenCalledWith(1.0, undefined, {});
        expect(sendCb).toHaveBeenCalledTimes(3);
        expect(doneCb).toHaveBeenCalledTimes(1);
    });

    test('should trigger a dim down', (done) => {
        dimProcessor.dim = jest.fn().mockReturnValue(of(100, 50, 0));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ target: 0.0, command: DimCommand.DIM.toString() }, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(1);
        expect(dimProcessor.dim).toHaveBeenCalledWith(0.0, undefined, {});
        expect(sendCb).toHaveBeenCalledTimes(3);
        expect(doneCb).toHaveBeenCalledTimes(1);
    });

    test('should trigger a pause', (done) => {
        dimProcessor.pause = jest.fn().mockReturnValue(of(50));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ command: DimCommand.PAUSE.toString() }, sendCb, doneCb);
        expect(dimProcessor.pause).toHaveBeenCalledTimes(1);
        expect(sendCb).toHaveBeenCalledTimes(1);
        expect(doneCb).toHaveBeenCalledTimes(1);
    });

    test('should trigger a reset', (done) => {
        dimProcessor.reset = jest.fn().mockReturnValue(of(0));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ command: DimCommand.RESET.toString() }, sendCb, doneCb);
        expect(dimProcessor.reset).toHaveBeenCalledTimes(1);
        expect(sendCb).toHaveBeenCalledTimes(1);
        expect(doneCb).toHaveBeenCalledTimes(1);
    });

    test('should trigger a validation error as target is out of allowed interval', () => {
        dimProcessor.dim = jest.fn();
        const doneCb = jest.fn();
        const sendCb = jest.fn();

        _sendMsg(1.1, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(0);
        expect(sendCb).toHaveBeenCalledTimes(0);
        expect(doneCb).toHaveBeenCalledTimes(1);
        expect(typeof doneCb.mock.calls[0][0]).toBe("string")
        expect(doneCb.mock.calls[0][0]).toContain("Invalid")

        jest.clearAllMocks();
        _sendMsg(-0.1, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(0);
        expect(sendCb).toHaveBeenCalledTimes(0);
        expect(doneCb).toHaveBeenCalledTimes(1);
        expect(typeof doneCb.mock.calls[0][0]).toBe("string")
        expect(doneCb.mock.calls[0][0]).toContain("Invalid")


        jest.clearAllMocks();
        _sendMsg("foo", sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(0);
        expect(sendCb).toHaveBeenCalledTimes(0);
        expect(doneCb).toHaveBeenCalledTimes(1);
        expect(typeof doneCb.mock.calls[0][0]).toBe("string")
        expect(doneCb.mock.calls[0][0]).toContain("Invalid")
        

        jest.clearAllMocks();
        _sendMsg({"target": 1, "start": 1.1}, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(0);
        expect(sendCb).toHaveBeenCalledTimes(0);
        expect(doneCb).toHaveBeenCalledTimes(1);
        expect(typeof doneCb.mock.calls[0][0]).toBe("string")
        expect(doneCb.mock.calls[0][0]).toContain("Invalid")
    });

    test('should trigger a validation error for unknown commands', (done) => {
        dimProcessor.dim = jest.fn();
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ command: "FOO" }, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(0);
        expect(sendCb).toHaveBeenCalledTimes(0);
        expect(doneCb).toHaveBeenCalledTimes(1);
        expect(typeof doneCb.mock.calls[0][0]).toBe("string")
        expect(doneCb.mock.calls[0][0]).toContain("Invalid")
    });

    test('should convert steps input param to step', (done) => {
        dimProcessor.dim = jest.fn().mockReturnValue(of(10));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ target: 1.0, config: { steps: 10 } }, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(1);
        expect(dimProcessor.dim).toBeCalledWith(1.0, undefined, { step: 0.1, steps: 10 });
    });

    test('should trigger a dim up using a start value', (done) => {
        dimProcessor.dim = jest.fn().mockReturnValue(of(100));
        const doneCb = jest.fn().mockImplementation(() => done());
        const sendCb = jest.fn();

        _sendMsg({ target: 1.0, command: DimCommand.DIM.toString(), start: 0.5 }, sendCb, doneCb);
        expect(dimProcessor.dim).toHaveBeenCalledTimes(1);
        expect(dimProcessor.dim).toHaveBeenCalledWith(1.0, 0.5, {});
        expect(sendCb).toHaveBeenCalledTimes(1);
        expect(doneCb).toHaveBeenCalledTimes(1);
    });
});
