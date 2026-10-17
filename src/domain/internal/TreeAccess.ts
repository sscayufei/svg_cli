/**
 * Package-internal structural capabilities, used only by the domain aggregate.
 * TypeScript has no package-private/friend access. Normal callers use
 * SvgDocument; these symbols must not be imported by application or CLI code.
 */
export const setNodeLocation = Symbol('setNodeLocation');
export const insertGroupChild = Symbol('insertGroupChild');
export const removeGroupChild = Symbol('removeGroupChild');
