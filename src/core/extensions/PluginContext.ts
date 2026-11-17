import type { EditorSession } from '../application/EditorSession.js';
import type { SessionEventSource, ResourceOwner } from '../application/SessionEvents.js';
import type { CommandHistory } from '../application/CommandHistory.js';
import type { SvgReadPort } from '../application/ports/SvgReadPort.js';
import type { SvgSavePort } from '../application/ports/SvgSavePort.js';
import type { ShapeFactory } from '../application/ShapeFactory.js';
import type { ExtensionRegistrations } from './ExtensionRegistry.js';
import type { DirectoryPort } from '../application/ports/DirectoryPort.js';
import type { AttributeHandler, CommandDefinition, ShapeProvider, TreeDecorator } from './Contracts.js';

export interface PluginContext {
  readonly session: EditorSession;
  readonly events: SessionEventSource;
  readonly resources: ResourceOwner;
  readonly directory: DirectoryPort;
  readonly history: CommandHistory;
  readonly store: SvgReadPort & SvgSavePort;
  readonly shapes: ShapeFactory;
  readonly shapeProviders: ExtensionRegistrations<ShapeProvider>;
  readonly commands: ExtensionRegistrations<CommandDefinition>;
  readonly attributes: ExtensionRegistrations<AttributeHandler>;
  readonly decorators: ExtensionRegistrations<TreeDecorator>;
}
export interface Plugin { activate(context: PluginContext, options?: unknown): void }
export interface PluginManifest {
  readonly name: string;
  readonly contributes?: Partial<Readonly<Record<'shapes' | 'commands' | 'attributes' | 'decorators', readonly string[]>>>;
}
