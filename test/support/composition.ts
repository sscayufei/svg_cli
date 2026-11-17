import { ExtensionRegistry, ShapeFactory, type ShapeProvider } from '@svgframe/core';
import { BuiltinShapesPlugin } from '@svgframe/builtin-shapes';
import { SvgReader } from '../../src/host/svg/SvgReader.js';
import { SvgFileStore } from '../../src/host/svg/SvgFileStore.js';

/** Tests opt into real built-ins, rather than relying on hidden core defaults. */
export function createBuiltinShapeFactory(): ShapeFactory {
  const providers = new ExtensionRegistry<ShapeProvider>('shapes');
  new BuiltinShapesPlugin().activate({ shapeProviders: providers });
  return new ShapeFactory(providers);
}
export function createFileStore(): SvgFileStore {
  return new SvgFileStore(undefined, undefined, new SvgReader(createBuiltinShapeFactory()));
}
