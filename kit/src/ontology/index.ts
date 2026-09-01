export {
  KIT_ENTITY_TYPES,
  MEMORY_ENTITY_TYPES,
  RELATION_NAMES,
  entityId,
  parseEntityId,
  type KitEntityType,
  type MemoryEntityType,
  type OntologySchema,
  type OntologyEntity,
  type OntologyEdge,
  type OntologyIndex,
  type RelationName
} from './types.js';

export { loadOntologySchema, schemaPath, indexPath } from './schema.js';
export {
  generateOntologyIndex,
  writeOntologyIndex,
  loadOntologyIndex,
  serializeOntologyIndex,
  getEntity,
  getRelated
} from './generate.js';
export { checkOntology, regenerateOntologyIndex, type OntologyCheckResult } from './validate.js';
export {
  validateMemoryEntityWrites,
  isAllowedMemoryEntityType,
  type MemoryEntityInput,
  type MemoryTypeValidation
} from './memory_types.js';
export { lintMemoryGraph, type MemoryLintResult } from './memory_lint.js';
