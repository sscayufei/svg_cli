import type { EditorSession } from '../application/EditorSession.js';
import type { CommandHistory } from '../application/CommandHistory.js';
import type { SvgReadPort } from '../application/ports/SvgReadPort.js';
import type { SvgSavePort } from '../application/ports/SvgSavePort.js';
import type { ShapeFactory } from '../application/ShapeFactory.js';
import type { ExtensionRegistry } from './ExtensionRegistry.js';
import type { AttributeHandler, CommandDefinition, ShapeProvider, TreeDecorator } from './Contracts.js';

export interface PluginContext {
  readonly session: EditorSession;
  readonly history: CommandHistory;
  readonly store: SvgReadPort & SvgSavePort;
  readonly shapes: ShapeFactory;
  readonly shapeProviders: ExtensionRegistry<ShapeProvider>;
  readonly commands: ExtensionRegistry<CommandDefinition>;
  readonly attributes: ExtensionRegistry<AttributeHandler>;
  readonly decorators: ExtensionRegistry<TreeDecorator>;
}
export interface Plugin { activate(context: PluginContext, options?: unknown): void }
export interface PluginManifest {
  readonly name: string;
  readonly contributes?: Partial<Readonly<Record<'shapes' | 'commands' | 'attributes' | 'decorators', readonly string[]>>>;
}
