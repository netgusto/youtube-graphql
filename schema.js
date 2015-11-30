import {
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLSchema,
    GraphQLNonNull,
    GraphQLID
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions
} from 'graphql-relay';

import Db from './db';
import _ from 'lodash';

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

/**
 * We define a connection between a person and its posts.
 *
 * connectionType implements the following type system shorthand:
 *   type PostConnection {
 *     edges: [PostEdge]
 *     pageInfo: PageInfo!
 *   }
 *
 * connectionType has an edges field - a list of edgeTypes that implement the
 * following type system shorthand:
 *   type PostEdge {
 *     cursor: String!
 *     node: Post
 *   }
 */

var { connectionType: postConnection } = connectionDefinitions({
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
            resolve: (person, args) => {
                return person.getPosts().then(personPosts => {
                    return connectionFromArray(
                        personPosts,
                        args
                    );
                });
            }
        }
    })
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

  people(first: 3) {
    id
    firstName
    lastName
    posts(first: 1) {

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
}

*/

const Query = new GraphQLObjectType({
    name: 'RootQueryType',
    description: 'This is a root query',
    fields: {
        people: {
            type: new GraphQLList(Person),
            args: {
                id: { type: GraphQLInt },
                email: { type: GraphQLString },
                first: { type: GraphQLInt }
            },
            resolve: (root, args) => {
                const query = {
                    where: _.without(args, ['first']),
                    limit: 'first' in args ? args.first : 10//,
                    //include: [Db.models.post] // fetch join
                };
                return getPersons(query);
            }
        },
        posts: {
            type: new GraphQLList(Post),
            args: {
                first: { type: GraphQLInt }
            },
            resolve: (root, args) => {
                const query = {
                    where: _.without(args, ['first']),
                    limit: 'first' in args ? args.first : 10
                };
                return getPosts(query);
            }
        },
        node: nodeField
    }
});

const Schema = new GraphQLSchema({
    query: Query,
    mutation: Mutation
});

export default Schema;
