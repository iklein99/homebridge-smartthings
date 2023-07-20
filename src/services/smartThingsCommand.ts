export class Command {
  capability: string;
  command: string;
  arguments?: unknown[];

  constructor(capability: string, command: string, args?: unknown[]) {
    this.capability = capability;
    this.command = command;
    this.arguments = args;
  }
}