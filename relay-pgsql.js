'use strict';

const base64 = (i) => new Buffer(i, 'ascii').toString('base64');

const unbase64 = (i) => new Buffer(i, 'base64').toString('ascii');

const decodeCursor = (cursorString) => JSON.parse(unbase64(cursorString));

const encodeCursor = (cursorData) => base64(JSON.stringify(cursorData));

export function connectionFromPgSqlSchema({ queryExecutor, pivotColumn, args }) {

    let dir = 'ASC';
    let limit = 10;
    if (args.last) {
        dir = 'DESC';
        limit = args.last;
    } else if (args.first) {
        limit = args.first;
    }

    let cursor = null;
    let seek = null;

    if (args.after) {
        cursor = decodeCursor(args.after);
        seek = {
            $or: [
              { [pivotColumn]: { $gt: cursor.pivot } },
              { $and: [
                { [pivotColumn]: { $eq: cursor.pivot } },
                { id: { $gt: cursor.id } }
              ]}
            ]
        };
    } else if (args.before) {
        cursor = decodeCursor(args.before);
        seek = {
            $or: [
              { [pivotColumn]: { $lt: cursor.pivot } },
              { $and: [
                  { [pivotColumn]: { $eq: cursor.pivot } },
                  { id: { $lt: cursor.id } }
              ]}
            ]
        };
    }

    const query = {
        limit: limit,
        order: [[pivotColumn, dir], ['id', dir]],
        where: seek
    };

    return queryExecutor(query).then(items => {

        let startCursor = null;
        let endCursor = null;
        const edges = items.map(item => {
            const itemCursor = encodeCursor({
                id: item.id,
                pivot: item[pivotColumn]
            });

            if (startCursor === null) { startCursor = itemCursor; }

            endCursor = itemCursor;

            return {
                cursor: itemCursor,
                node: item
            };
        });

        return {
            edges,
            pageInfo: {
                startCursor,
                endCursor,
                hasPreviousPage: false,
                hasNextPage: false
            }
        };
    });
}
