/**
 * TASK 1.1.4: Build Module Registry System - Pluggable data source module system
 */

export interface DataSourceModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  parsers: { name: string; fileTypes: string[] }[];
  transforms: { id: string; name: string; description: string; }[];
  enabled: boolean;
}

export class ModuleRegistry {
  private static modules = new Map<string, DataSourceModule>();

  static register(module: DataSourceModule): void {
    this.modules.set(module.id, module);
  }

  static get(moduleId: string): DataSourceModule | undefined {
    return this.modules.get(moduleId);
  }

  static getAll(): DataSourceModule[] {
    return Array.from(this.modules.values());
  }

  static getEnabled(): DataSourceModule[] {
    return Array.from(this.modules.values()).filter(m => m.enabled);
  }

  static enable(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.enabled = true;
    }
  }

  static disable(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.enabled = false;
    }
  }

  // Initialize default modules
  static initializeDefaultModules(): void {
    this.register({
      id: 'financial',
      name: 'Financial Intelligence',
      description: 'Bank statements, transactions, money flow analysis',
      icon: '💰',
      parsers: [
        { name: 'BankStatementParser', fileTypes: ['csv', 'xlsx', 'pdf'] },
      ],
      transforms: [
        { id: 'money-flow', name: 'Money Flow Analysis', description: 'Multi-hop money tracing' },
        { id: 'velocity', name: 'Velocity Detection', description: 'Transaction velocity analysis' },
        { id: 'mule-detection', name: 'Mule Detection', description: 'Identify money mule patterns' },
        { id: 'clustering', name: 'Transaction Clustering', description: 'Spending pattern analysis' },
      ],
      enabled: true,
    });

    this.register({
      id: 'telecom',
      name: 'Telecom Intelligence',
      description: 'CDR analysis, location tracking, call patterns',
      icon: '📱',
      parsers: [
        { name: 'CDRParser', fileTypes: ['csv', 'xlsx'] },
      ],
      transforms: [
        { id: 'contact-network', name: 'Contact Network', description: 'Build call graph' },
        { id: 'night-stay', name: 'Night Stay Location', description: 'Detect residence' },
        { id: 'movement', name: 'Movement Pattern', description: 'Track movement timeline' },
        { id: 'co-location', name: 'Co-Location', description: 'Find proximity events' },
        { id: 'call-pattern', name: 'Call Pattern', description: 'Behavioral analysis' },
      ],
      enabled: true,
    });

    this.register({
      id: 'social-media',
      name: 'Social Media Intelligence',
      description: 'OSINT, profile scraping, content analysis',
      icon: '📷',
      parsers: [],
      transforms: [
        { id: 'profile-scrape', name: 'Profile Scraping', description: 'OSINT profile data' },
        { id: 'connection-network', name: 'Connection Network', description: 'Social graph' },
        { id: 'content-analysis', name: 'Content Analysis', description: 'NLP and sentiment' },
        { id: 'reverse-image', name: 'Reverse Image', description: 'Image verification' },
      ],
      enabled: true,
    });

    this.register({
      id: 'email',
      name: 'Email Intelligence',
      description: 'Email header analysis, phishing detection',
      icon: '📧',
      parsers: [
        { name: 'EmailParser', fileTypes: ['eml', 'msg'] },
      ],
      transforms: [
        { id: 'header-analysis', name: 'Header Analysis', description: 'Parse email headers' },
        { id: 'authenticity', name: 'Authenticity Check', description: 'SPF/DKIM verification' },
      ],
      enabled: true,
    });

    this.register({
      id: 'web',
      name: 'Web Intelligence',
      description: 'WHOIS lookup, hosting analysis, phishing detection',
      icon: '🌐',
      parsers: [],
      transforms: [
        { id: 'whois', name: 'WHOIS Lookup', description: 'Domain registration data' },
        { id: 'hosting', name: 'Hosting Analysis', description: 'Server and IP analysis' },
        { id: 'phishing', name: 'Phishing Detection', description: 'Detect phishing sites' },
      ],
      enabled: true,
    });
  }
}

// Initialize on load
ModuleRegistry.initializeDefaultModules();

