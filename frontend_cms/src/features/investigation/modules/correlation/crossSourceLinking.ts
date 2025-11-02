/**
 * TASK 5.1.2: Cross-Source Linking - Auto-link and merge entities
 */

import { Node, Link } from '../../types';

export class CrossSourceLinker {
  static autoLink(entities: Node[]): Link[] {
    const links: Link[] = [];
    const linkId = () => `auto-link-${Date.now()}-${Math.random()}`;

    // Find entities with matching attributes
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        // Check for matching phone numbers
        if (this.hasMatchingPhone(entity1, entity2)) {
          links.push({
            id: linkId(),
            source: entity1.id,
            target: entity2.id,
            label: 'SAME_PHONE',
            type: 'CONNECTED',
          });
        }

        // Check for matching addresses
        if (this.hasMatchingAddress(entity1, entity2)) {
          links.push({
            id: linkId(),
            source: entity1.id,
            target: entity2.id,
            label: 'SAME_ADDRESS',
            type: 'LOCATED_AT',
          });
        }

        // Check for matching device (IMEI)
        if (this.hasMatchingDevice(entity1, entity2)) {
          links.push({
            id: linkId(),
            source: entity1.id,
            target: entity2.id,
            label: 'SHARED_DEVICE',
            type: 'USED_DEVICE',
          });
        }
      }
    }

    return links;
  }

  static mergeEntities(entities: Node[], confidence: number = 0.8): Node[] {
    const merged: Node[] = [];
    const processed = new Set<string>();

    for (const entity of entities) {
      if (processed.has(entity.id)) continue;

      const duplicates = entities.filter(e => 
        !processed.has(e.id) && 
        e.id !== entity.id &&
        this.areDuplicates(entity, e, confidence)
      );

      if (duplicates.length > 0) {
        // Merge metadata
        const mergedEntity: Node = {
          ...entity,
          metadata: {
            ...entity.metadata,
            merged_from: [entity.id, ...duplicates.map(d => d.id)],
            sources: [entity.type, ...duplicates.map(d => d.type)],
          },
        };

        merged.push(mergedEntity);
        processed.add(entity.id);
        duplicates.forEach(d => processed.add(d.id));
      } else {
        merged.push(entity);
        processed.add(entity.id);
      }
    }

    return merged;
  }

  private static hasMatchingPhone(e1: Node, e2: Node): boolean {
    return e1.metadata?.phone && e2.metadata?.phone &&
           e1.metadata.phone === e2.metadata.phone;
  }

  private static hasMatchingAddress(e1: Node, e2: Node): boolean {
    return e1.metadata?.address && e2.metadata?.address &&
           e1.metadata.address.toLowerCase() === e2.metadata.address.toLowerCase();
  }

  private static hasMatchingDevice(e1: Node, e2: Node): boolean {
    return e1.metadata?.imei && e2.metadata?.imei &&
           e1.metadata.imei === e2.metadata.imei;
  }

  private static areDuplicates(e1: Node, e2: Node, confidence: number): boolean {
    // Simple duplicate detection
    if (e1.label.toLowerCase() === e2.label.toLowerCase()) return true;
    if (e1.type === e2.type && this.hasMatchingPhone(e1, e2)) return true;
    return false;
  }
}

