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
    private stack_: Stack<IStateTask>;          // the running stack
    private transitions_: ITransition[];        // transition between tasks


    //----- methods
    constructor() {
        // set the vars
        this.stack_ = new Stack<IStateTask>();
        this.transitions_ = [];
    }

    // add a new transiction
    public add(item: ITransition): void {
        this.transitions_.push(item);
    }

    // find the transition corresponding to a particular (event/task)
    private find(event: States, from:IStateTask|undefined): ITransition|undefined {
        // go through all the items
        for (let i = 0; i < this.transitions_.length; i++) {
            let transition = this.transitions_[i];
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
        let from = this.stack_.top();
        let transition = this.find(event, from);

        // no transition defined for this pair
        if (transition === undefined) {
            console.log(`Error: no transition defined for ${from.name} with event ${event.toString()}`);
            return;
        }

        // perform the action depending on the event and transition result
        switch(event) {
            case States.S_BEGIN: {  // add first task to the stack
                this.stack_.push(transition.to);
                this.stack_.top().setup();
                break;
            }
            case States.S_END: {    // remove previous task, push new one
                from.cleanup();
                this.stack_.push(transition.to);
                this.stack_.top().setup();
                break;
            }
            case States.S_PAUSE: {  // pause the current task, add a new one on top
                this.stack_.push(transition.to);
                this.stack_.top().setup();
                break;
            }
            case States.S_RESUME: { // remove top task
                from.cleanup();
                this.stack_.pop();
                break;
            }
        }
    }

    // run the states manager
    private run(time: number|undefined): void {
        // no task defined on the top
        if (this.stack_.top() === undefined)
            return;

        // run the task on top of the stack
        let result = this.stack_.top().run(time);

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