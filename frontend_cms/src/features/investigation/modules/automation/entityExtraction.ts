/**
 * TASK 5.2.2: Entity Extraction Pipeline - Auto-extraction with confidence scoring
 */

export class EntityExtractor {
  static extract(text: string): {
    entity: string;
    type: string;
    value: string;
    confidence: number;
    position: { start: number; end: number };
  }[] {
    const entities: any[] = [];

    // Extract phone numbers
    const phonePattern = /(\+91[-\s]?)?[6-9]\d{9}/g;
    let match;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        entity: 'phone',
        type: 'phone',
        value: match[0],
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        entity: 'email',
        type: 'email',
        value: match[0],
        confidence: 0.98,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract account numbers
    const accountPattern = /\b\d{9,18}\b/g;
    while ((match = accountPattern.exec(text)) !== null) {
      entities.push({
        entity: 'account',
        type: 'account',
        value: match[0],
        confidence: 0.7,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract IPs
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    while ((match = ipPattern.exec(text)) !== null) {
      entities.push({
        entity: 'ip',
        type: 'ip',
        value: match[0],
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    return entities;
  }
}

