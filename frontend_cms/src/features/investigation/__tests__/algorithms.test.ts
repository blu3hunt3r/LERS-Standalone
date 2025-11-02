/**
 * TASK 7.2.1: Unit Tests - Test algorithms, parsers, and transforms
 */

import { calculateLayers, findShortestPath, detectCycles, detectCommunities } from '../utils/graphAlgorithms';
import { BankStatementParser } from '../modules/financial';
import { CDRParser } from '../modules/telecom';

describe('Graph Algorithms', () => {
  describe('calculateLayers', () => {
    it('should assign layer 0 to victim node', () => {
      const nodes = [{ id: '1', x: 0, y: 0, label: 'Node 1', type: 'person', metadata: {}, risk_level: 'low', entity: {} as any }];
      const links = [];
      const layers = calculateLayers(nodes, links, '1');
      expect(layers.get('1')).toBe(0);
    });
  });

  describe('findShortestPath', () => {
    it('should find shortest path between two nodes', () => {
      const nodes = [
        { id: '1', x: 0, y: 0, label: 'A', type: 'person', metadata: {}, risk_level: 'low', entity: {} as any },
        { id: '2', x: 0, y: 0, label: 'B', type: 'person', metadata: {}, risk_level: 'low', entity: {} as any },
      ];
      const links = [{ id: 'l1', source: '1', target: '2', label: 'CONNECTED', type: 'CONNECTED' }];
      const path = findShortestPath(nodes, links, '1', '2');
      expect(path).toEqual(['1', '2']);
    });
  });
});

describe('Parsers', () => {
  describe('BankStatementParser', () => {
    it('should parse CSV bank statement', () => {
      const csv = 'Date,Description,Amount,Balance\n2025-01-01,Deposit,1000,1000';
      const statement = BankStatementParser.parseCSV(csv);
      expect(statement.transactions.length).toBe(1);
    });
  });

  describe('CDRParser', () => {
    it('should parse CSV CDR file', () => {
      const csv = 'Date,Time,Calling,Called,Type,Duration\n2025-01-01,10:00,9876543210,9876543211,O,120';
      const cdr = CDRParser.parseCSV(csv, '9876543210');
      expect(cdr.records.length).toBe(1);
    });
  });
});

