'use strict';

import Sequelize from 'sequelize';
import Faker from 'faker';
import _ from 'lodash';

const Conn = new Sequelize(
    'youtube-relaydb',      // db
    'jerome',   // username
    '',  // password
    {
        dialect: 'postgres',
        host: '127.0.0.1'
    }
);

const Person = Conn.define('person', {
    firstName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    lastName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    }
});

const Post = Conn.define('post', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    content: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

Person.hasMany(Post);
Post.belongsTo(Person);

Conn.sync({ force: true }).then(() => {
    _.times(10, () => {
        return Person.create({
            firstName: Faker.name.firstName(),
            lastName: Faker.name.lastName(),
            email: Faker.internet.email()
        }).then(person => {
            return person.createPost({
                title: 'Un article de ' + person.lastName,
                content: 'Super !'
            });
        });
    });
});

export default Conn;
