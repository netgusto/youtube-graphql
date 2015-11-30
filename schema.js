import {
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLSchema
} from 'graphql';

import Db from './db';

const Person = new GraphQLObjectType({
    name: 'Person',
    description: 'This represents a person',
    fields: () => ({
        id: {
            type: GraphQLInt,
            resolve: (person) => person.id
        },
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
            type: new GraphQLList(Post),
            resolve: (person) => person.getPosts()
        }
    })
});

const Post = new GraphQLObjectType({
    name: 'Post',
    description: 'This represents a post',
    fields: () => ({
        id: {
            type: GraphQLInt,
            resolve: (post) => post.id
        },
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

const Query = new GraphQLObjectType({
    name: 'Query',
    description: 'This is a root query',
    fields: () => {
        return {
            people: {
                type: new GraphQLList(Person),
                args: {
                    id: { type: GraphQLInt },
                    email: { type: GraphQLString }
                },
                resolve: (root, args) => {
                    console.log(root);
                    return Db.models.person.findAll({ where: args });
                }
            },
            posts: {
                type: new GraphQLList(Post),
                resolve: (root, args) => {
                    return Db.models.post.findAll({ where: args });
                }
            }
        };
    }
});

const Schema = new GraphQLSchema({
    query: Query
});

export default Schema;
