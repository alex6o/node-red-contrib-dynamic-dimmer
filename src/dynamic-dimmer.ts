import { Red, Node } from 'node-red'
import { DimProcessorFactory, DimProcessor } from './services/dim-processor';
import { NodeConfig, InputValidationError } from './models/node';
import { Observable, empty } from 'rxjs';
import { ValidationFailed } from '@marcj/marshal';
import { DimCommandMessage, DimCommand } from './models/dtos';
import { convertInput, convertDimConfigUpdate } from './converter/dto-converter';


module.exports = (RED: Red): void => {

    class DynamicDimmerController {
        private dimProcessor: DimProcessor;
        private config: NodeConfig;
        private node: Node;

        constructor(config: NodeConfig) {

            this.config = config;
            RED.nodes.createNode(this as any, this.config);
            this.node = this as any;

            this.dimProcessor = DimProcessorFactory.getProcessor({
                eventInterval: this.config.eventInterval,
                minValue: this.config.minValue,
                maxValue: this.config.maxValue,
                step: 1.0 / this.config.steps
            });

            this.registerInput();
        }

        private registerInput(): void {
            this.node.on('input', (msg: any, send: Function, done: Function) => {
                try {
                    const inputMsg = convertInput(msg);
                    const sendValue = {
                        next: (v: number): void => {
                            this.reportStatus(v);
                            send(Object.assign(msg, { payload: v }));
                        },
                        complete: (): void => {
                            this.clearStatus();
                            done();
                        }
                    };
                    this.mapCommand(inputMsg.payload).subscribe(sendValue);
                } catch (error) {
                    if (error instanceof ValidationFailed) {
                        done(new InputValidationError("Invalid message type provided!", error.errors).toString());
                    } else {
                        done(error.toString());
                    }
                }
            })
        }

        private reportStatus(dimValue: number): void {
            this.node.status({ fill: "blue", shape: "dot", text: `dimming (${dimValue})` });
        }

        private clearStatus(): void {
            this.node.status({});
        }

        private mapCommand(dimMsg: DimCommandMessage): Observable<number> {
            let dimOperation$;
            const config = convertDimConfigUpdate(dimMsg.config);

            switch (dimMsg.command) {
                case DimCommand.DIM:
                    dimOperation$ = this.dimProcessor.dim(dimMsg.target, config);
                    break;
                case DimCommand.PAUSE:
                    dimOperation$ = this.dimProcessor.pause();
                    break;
                case DimCommand.SET:
                    dimOperation$ = this.dimProcessor.set(dimMsg.target, config);
                    break;
                case DimCommand.RESET:
                    dimOperation$ = this.dimProcessor.reset(config);
                    break;
                default:
                    dimOperation$ = empty();
                    break;
            }
            return dimOperation$;
        }
    }

    RED.nodes.registerType('dynamic-dimmer', DynamicDimmerController as any)
}
