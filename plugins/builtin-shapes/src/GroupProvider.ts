import { SvgGroup } from '@svgframe/core';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class GroupProvider extends BaseShapeProvider {
  public constructor() { super('g', [], 0, false, { syntax: "create g <id>", description: "empty group; all creates accept in <containerId>" }); }
  protected build(id: string, args: readonly string[]) { return new SvgGroup(id); }
}
