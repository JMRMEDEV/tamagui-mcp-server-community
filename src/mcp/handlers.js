import {
  searchDocs,
  getPageByRoute,
  getComponentDocs,
  getPackageDocs,
  getInstallationDocs,
  listSections,
  listComponents,
  explainTopic,
  doctorCorpus,
} from '../retrieval/retrieve.js';

function textResult(data) {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}

export function handleToolCall(name, args) {
  switch (name) {
    case 'search_docs':
      return textResult(searchDocs(args.query, {
        limit: args.limit,
        section: args.section,
        packageFilter: args.packageFilter,
        componentFilter: args.componentFilter,
      }));

    case 'get_page':
      const page = getPageByRoute(args.route);
      return page ? textResult(page) : textResult({ error: `Page not found: ${args.route}` });

    case 'get_component_docs':
      const comp = getComponentDocs(args.name);
      return comp ? textResult(comp) : textResult({ error: `Component not found: ${args.name}` });

    case 'get_installation_docs':
      return textResult(getInstallationDocs(args.framework));

    case 'get_package_docs':
      const pkg = getPackageDocs(args.name);
      return pkg ? textResult(pkg) : textResult({ error: `Package not found: ${args.name}` });

    case 'list_sections':
      return textResult(listSections());

    case 'list_components':
      return textResult(listComponents());

    case 'explain_topic':
      return textResult(explainTopic(args.query));

    case 'doctor_corpus':
      return textResult(doctorCorpus());

    case 'refresh_instructions':
      return textResult({
        instructions: [
          '1. npm run acquire    — Crawl Tamagui docs and download llms.txt files',
          '2. npm run normalize  — Parse and chunk the downloaded corpus',
          '3. npm run index      — Build search indexes',
          '4. npm run verify     — Verify corpus integrity',
          '5. npm run start      — Start the MCP server',
          '',
          'To refresh only: npm run refresh',
          'To diagnose issues: npm run doctor',
        ].join('\n'),
      });

    default:
      return textResult({ error: `Unknown tool: ${name}` });
  }
}
