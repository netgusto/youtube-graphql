'use strict';

import Sequelize from 'sequelize';

//import Faker from 'faker';
//import _ from 'lodash';

const Conn = new Sequelize(
    'youtube-relaydb',      // db
    'jerome',   // username
    '',  // password
    {
        dialect: 'postgres',
        host: '127.0.0.1',
        debug: false
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

/*Conn.sync({ force: true }).then(() => {
    _.times(100, () => {
        return Person.create({
            firstName: Faker.name.firstName(),
            lastName: Faker.name.lastName(),
            email: Faker.internet.email()
        }).then(person => {
            const p = [];
            for (let k = 0; k < 100; k++) {
                p.push(person.createPost({
                    title: 'Un article #' + k + ' de ' + person.lastName,
                    content: 'Super !'
                }));
            }

            return Promise.all(p);
        });
    });
});*/

export default Conn;
