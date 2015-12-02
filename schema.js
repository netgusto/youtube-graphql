import {
    GraphQLObjectType,

    //GraphQLInt,

    GraphQLString,

    //GraphQLList,

    GraphQLSchema,
    GraphQLNonNull,
    GraphQLID
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,

//  connectionFromArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions
} from 'graphql-relay';

import Db from './db';

//import _ from 'lodash';

import { connectionFromPgSqlSchema } from './relay-pgsql';

const getPost = (id) => Db.models.post.findById(id);
const getPosts = (query) => Db.models.post.findAll(query);
const createPost = ({ postTitle, postContent/*, personId*/ }) => {
    return Db.models.post.build({
        title: postTitle,
        content: postContent
    }).save();
};

const getPerson = (id) => Db.models.person.findById(id);
const getPersons = (query) => Db.models.person.findAll(query);

var { nodeField, nodeInterface } = nodeDefinitions(
  (globalId) => {
      var { type, id } = fromGlobalId(globalId);
      if (type === 'Post') {
          return getPost(id);
      } else if (type === 'Person') {
          return getPerson(id);
      } else {
          return null;
      }
  },

  (obj) => {
      return obj.firstName ? Person : Post;
  }
);

const Post = new GraphQLObjectType({
    name: 'Post',
    description: 'This represents a post',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField('Post'),
        title: {
            type: GraphQLString,
            resolve: (post) => post.title
        },
        content: {
            type: GraphQLString,
            resolve: (post) => post.content
        },
        person: {
            type: Person,
            resolve: (post) => post.getPerson()
        }
    })
});

const { connectionType: postConnection } = connectionDefinitions({
    name: 'Post',
    nodeType: Post
});

const Person = new GraphQLObjectType({
    name: 'Person',
    description: 'This represents a person',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField('Person'),
        firstName: {
            type: GraphQLString,
            resolve: (person) => person.firstName
        },
        lastName: {
            type: GraphQLString,
            resolve: (person) => person.lastName
        },
        email: {
            type: GraphQLString,
            resolve: (person) => person.email
        },
        posts: {
            type: postConnection,
            description: 'The posts of this person.',
            args: connectionArgs,
            resolve: (person, args) => connectionFromPgSqlSchema({
                queryExecutor: person.getPosts.bind(person),
                pivotColumn: 'createdAt',
                args
            })
        }
    })
});

const { connectionType: personConnection } = connectionDefinitions({
    name: 'Person',
    nodeType: Person
});

/*

mutation addPost($input: postMutationInput!) {
  addPost(input: $input) {
    post {
      id
      title
    }
  }
}

query variables:
{
  "input": {
    "postTitle": "Le post !!!",
    "postContent": "Le contenu du post !!!",
    "personId": 1,
    "clientMutationId": "ONETWO"
  }
}

*/

var postMutation = mutationWithClientMutationId({
    name: 'postMutation',
    inputFields: {
        postTitle: {
            type: new GraphQLNonNull(GraphQLString)
        },
        postContent: {
            type: new GraphQLNonNull(GraphQLString)
        },
        personId: {
            type: new GraphQLNonNull(GraphQLID)
        }
    },
    outputFields: {
        post: {
            type: Post,
            resolve: (payload) => payload.post
        },
        person: {
            type: Person,
            resolve: (payload) => getPerson(payload.personId)
        }
    },
    mutateAndGetPayload: ({ postTitle, postContent, personId }) => {
        return createPost({ postTitle, postContent, personId }).then(newPost => {
            return {
                post: newPost,
                personId: personId
            };
        });
    }
});

/**
 * This is the type that will be the root of our mutations,
 * and the entry point into performing writes in our schema.
 *
 * This implements the following type system shorthand:
 *   type Mutation {
 *     introduceShip(input: IntroduceShipInput!): IntroduceShipPayload
 *   }
 */
var Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addPost: postMutation
    }
});

/*

query {

  tsup

  node(id: "UGVyc29uOjM=") {
    ... on Post {
      title
      content
    }
    ... on Person {
      firstName
      lastName
    }
  }

  posts(first: 10, after: "eyJpZCI6MjExLCJwaXZvdCI6IjIwMTUtMTItMDJUMDc6NTA6MjMuMDU1WiJ9") {
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
    edges {
      node {
        id
        ... on Post {
          title
        }
      }
    }
  }

  people(first: 5) {
    edges {
      node {
        id
        ... on Person {
          firstName
          lastName
          posts(last: 10) {

            edges {
              node {
                id
                ... on Post {
                  title
                }
              }
            }

            pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
            }
          }
        }
      }
    }
  }
}

*/

const Query = new GraphQLObjectType({
    name: 'RootQueryType',
    description: 'This is a root query',
    fields: {

        tsup: {
            type: GraphQLString,
            resolve: () => 'Tsup !'
        },

        people: {
            type: personConnection,
            description: 'The people.',
            args: connectionArgs,
            resolve: (root, args) => connectionFromPgSqlSchema({
                queryExecutor: getPersons,
                pivotColumn: 'createdAt',
                args
            })
        },

        posts: {
            type: postConnection,
            description: 'The posts.',
            args: connectionArgs,
            resolve: (root, args) => connectionFromPgSqlSchema({
                queryExecutor: getPosts,
                pivotColumn: 'createdAt',
                args
            })
        },

        node: nodeField
    }
});

const Schema = new GraphQLSchema({
    query: Query,
    mutation: Mutation
});

export default Schema;
