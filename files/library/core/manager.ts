/*
 * @file    manager.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Game/Effect State Manager
 */

//----- imports
import { Stack } from "./stack";


//----- interfaces
export enum States {
    S_BEGIN = 0,
    S_END,
    S_RUNNING,
    S_PAUSE,
    S_RESUME
}

interface ITransition {
    event: States,
    from: IStateTask,
    to: IStateTask
}


//----- classes
// an simple task to run on the State Manager
export abstract class IStateTask {
    //----- members
    public name: string;

    //----- methods
    constructor(name: string) {
        this.name = name;
    }

    // function called to setup the task before running it
    public abstract setup(): void;

    // function called to cleanup the task after running it
    public abstract cleanup(): void;

    // main running function
    public abstract run(time: number|undefined): States;
}

