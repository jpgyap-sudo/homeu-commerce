'use strict';
const fs = require('fs');
const path = require('path');

const dir = 'node_modules/@davincios/graphql';
fs.mkdirSync(dir, { recursive: true });

// Create index.js with configToSchema export
// configToSchema is called by packages/next/dist/routes/graphql/handler.js:1:
//   import { configToSchema } from '@davincios/graphql'
// It receives resolvedConfig and returns { schema, validationRules }
const indexJs = `import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

// configToSchema — called by packages/next/dist/routes/graphql/handler.js:66
// Returns a minimal GraphQL schema so GraphQL endpoint doesn't crash.
// The schema includes a single _empty query field.
export function configToSchema(config) {
  const queryType = new GraphQLObjectType({
    name: 'Query',
    description: 'Auto-generated stub query (configToSchema stub)',
    fields: {
      _empty: {
        type: GraphQLString,
        description: 'Stub field — no real data available without @davincios/graphql'
      }
    }
  });

  return {
    schema: new GraphQLSchema({ query: queryType }),
    validationRules: () => []
  };
}
`;

fs.writeFileSync(path.join(dir, 'index.js'), indexJs);

console.log('Created @davincios/graphql stub with configToSchema export');
