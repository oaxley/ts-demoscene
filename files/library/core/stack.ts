/*
 * @file    stack.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   FIFO generic stack
 */

//----- interface
// stack interface
interface IStack<T> {
    push(item: T): void;        // push a new item on the stack
    pop(): T | undefined;       // pop the top item from the stack
    top(): T | undefined;       // peek at the top item from the stack
    size(): number;             // return the current stack size
}


//----- class
export class Stack<T> implements IStack<T> {
    //----- members
    private fifo_: T[] = [];


    //----- methods
    public constructor() { }

    // return the current size of the stack
    public size(): number {
        return this.fifo_.length;
    }

    // push a new item on top of the stack
    public push(item: T): void {
        this.fifo_.push(item);
    }

    // retrieve the top item
    public pop(): T | undefined {
        return this.fifo_.pop();
    }

    // peek at the top of the stack
    public top(): T | undefined {
        return this.fifo_[this.size() - 1];
    }
}