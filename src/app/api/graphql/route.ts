import { createSchema, createYoga } from 'graphql-yoga';
import type { NextRequest } from 'next/server';
import { typeDefs } from '@/graphql/schema';
import { resolvers, createContext } from '@/graphql/resolvers';

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: createContext,
});

async function handler(request: NextRequest) {
  return yoga.fetch(request, {});
}

export { handler as GET, handler as POST, handler as OPTIONS };
