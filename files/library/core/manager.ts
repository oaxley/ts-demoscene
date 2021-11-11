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

interface IStateTransition {
    event: States,
    from?: IStateTask,
    to?: IStateTask
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

// states manager main class
export class StatesManager {
    //----- members
    private static instance_: StatesManager;             // singleton instance

    private static stack_: Stack<IStateTask>;           // the running stack
    private static transitions_: IStateTransition[];    // transition between tasks

    //----- methods
    private constructor() {
        // set the vars
        StatesManager.stack_ = new Stack<IStateTask>();
        StatesManager.transitions_ = [];
    }

    // get the current running instance
    public static getInstance(): StatesManager {
        if (!StatesManager.instance_) {
            StatesManager.instance_ = new this();
        }

        return StatesManager.instance_;
    }

    // add a new transiction
    public add(item: IStateTransition): void {
        StatesManager.transitions_.push(item);
    }

    // find the transition corresponding to a particular (event/task)
    private find(event: States, from:IStateTask|undefined): IStateTransition|undefined {
        // go through all the items
        for (let i = 0; i < StatesManager.transitions_.length; i++) {
            let transition = StatesManager.transitions_[i];
            if ((transition.event == event) && (transition.from == from))
                return transition;
        }

        return undefined;
    }

    // move to another state if possible
    private move(event: States): void {
        // if the task is still running, nothing to be done
        if (event == States.S_RUNNING)
            return;

        // retrieve the corresponding transition
        let from = StatesManager.stack_.top();
        let transition = this.find(event, from);

        // no transition defined for this pair
        if (transition === undefined) {
            let name = (from === undefined) ? "undefined" : from.name;
            console.log(`Error: no transition defined for '${name}' with event '${event.toString()}'`);
            return;
        }


        // perform the action depending on the event and transition result
        switch(event) {
            case States.S_BEGIN: {  // add first task to the stack
                StatesManager.stack_.push(transition.to!);
                StatesManager.stack_.top()!.setup();
                break;
            }
            case States.S_END: {    // remove previous task, push new one
                from!.cleanup();
                if (transition.to !== undefined) {
                    StatesManager.stack_.push(transition.to);
                    StatesManager.stack_.top()!.setup();
                }
                break;
            }
            case States.S_PAUSE: {  // pause the current task, add a new one on top
                StatesManager.stack_.push(transition.to!);
                StatesManager.stack_.top()!.setup();
                break;
            }
            case States.S_RESUME: { // remove top task
                from!.cleanup();
                StatesManager.stack_.pop();
                break;
            }
        }
    }

    // run the states manager
    private run(time?: number): void {
        // retrieve the task on top of the stack
        let task = StatesManager.stack_.top();

        // no task defined on the top
        if (task === undefined)
            return;

        // run the task
        let result = task.run(time);

        // move the state according to the result
        this.move(result);

        // restart the task on the next frame update
        requestAnimationFrame(this.run.bind(this));
    }

    // public function to start the States manager
    public start(): void {
        // insert the first task on the stack
        this.move(States.S_BEGIN);

        // call the run function
        requestAnimationFrame(this.run.bind(this));
    }
}