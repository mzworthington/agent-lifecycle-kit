/**
 * Local knowledge-graph store compatible with @modelcontextprotocol/server-memory JSONL.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

export class KnowledgeGraphManager {
  constructor(private readonly filePath: string) {}

  async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const lines = data.split('\n').filter((line) => line.trim() !== '');
      return lines.reduce(
        (graph, line) => {
          const item = JSON.parse(line) as Record<string, unknown>;
          if (item.type === 'entity') {
            graph.entities.push({
              name: String(item.name),
              entityType: String(item.entityType),
              observations: Array.isArray(item.observations)
                ? item.observations.map(String)
                : []
            });
          }
          if (item.type === 'relation') {
            graph.relations.push({
              from: String(item.from),
              to: String(item.to),
              relationType: String(item.relationType)
            });
          }
          return graph;
        },
        { entities: [], relations: [] } as KnowledgeGraph
      );
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map((e) =>
        JSON.stringify({
          type: 'entity',
          name: e.name,
          entityType: e.entityType,
          observations: e.observations
        })
      ),
      ...graph.relations.map((r) =>
        JSON.stringify({
          type: 'relation',
          from: r.from,
          to: r.to,
          relationType: r.relationType
        })
      )
    ];
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });
    const tempFilePath = path.join(
      directory,
      `${path.basename(this.filePath)}.${randomBytes(16).toString('hex')}.tmp`
    );
    try {
      await fs.writeFile(tempFilePath, lines.join('\n'));
      await fs.rename(tempFilePath, this.filePath);
    } catch (error) {
      await fs.unlink(tempFilePath).catch(() => undefined);
      throw error;
    }
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const created: Entity[] = [];
    for (const e of entities) {
      if (graph.entities.some((x) => x.name === e.name)) continue;
      graph.entities.push(e);
      created.push(e);
    }
    await this.saveGraph(graph);
    return created;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const created: Relation[] = [];
    for (const r of relations) {
      if (
        graph.relations.some(
          (x) => x.from === r.from && x.to === r.to && x.relationType === r.relationType
        )
      ) {
        continue;
      }
      graph.relations.push(r);
      created.push(r);
    }
    await this.saveGraph(graph);
    return created;
  }

  async addObservations(
    observations: Array<{ entityName: string; contents: string[] }>
  ): Promise<Array<{ entityName: string; addedObservations: string[] }>> {
    const graph = await this.loadGraph();
    const results: Array<{ entityName: string; addedObservations: string[] }> = [];
    for (const obs of observations) {
      const entity = graph.entities.find((e) => e.name === obs.entityName);
      if (!entity) {
        throw new Error(`Entity not found: ${obs.entityName}`);
      }
      const added: string[] = [];
      for (const c of obs.contents) {
        if (!entity.observations.includes(c)) {
          entity.observations.push(c);
          added.push(c);
        }
      }
      results.push({ entityName: obs.entityName, addedObservations: added });
    }
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(names: string[]): Promise<void> {
    const graph = await this.loadGraph();
    const drop = new Set(names);
    graph.entities = graph.entities.filter((e) => !drop.has(e.name));
    graph.relations = graph.relations.filter((r) => !drop.has(r.from) && !drop.has(r.to));
    await this.saveGraph(graph);
  }

  async deleteObservations(
    deletions: Array<{ entityName: string; observations: string[] }>
  ): Promise<void> {
    const graph = await this.loadGraph();
    for (const d of deletions) {
      const entity = graph.entities.find((e) => e.name === d.entityName);
      if (!entity) continue;
      const remove = new Set(d.observations);
      entity.observations = entity.observations.filter((o) => !remove.has(o));
    }
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(
      (r) =>
        !relations.some(
          (d) => d.from === r.from && d.to === r.to && d.relationType === r.relationType
        )
    );
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const q = query.toLowerCase();
    const filteredEntities = graph.entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q) ||
        e.observations.some((o) => o.toLowerCase().includes(q))
    );
    const names = new Set(filteredEntities.map((e) => e.name));
    const filteredRelations = graph.relations.filter((r) => names.has(r.from) || names.has(r.to));
    return { entities: filteredEntities, relations: filteredRelations };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const want = new Set(names);
    const filteredEntities = graph.entities.filter((e) => want.has(e.name));
    const filteredNames = new Set(filteredEntities.map((e) => e.name));
    const filteredRelations = graph.relations.filter(
      (r) => filteredNames.has(r.from) || filteredNames.has(r.to)
    );
    return { entities: filteredEntities, relations: filteredRelations };
  }
}
