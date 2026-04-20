const { Request, TYPES } = require('tedious');
const bcrypt = require('bcrypt');

function ensureConnected(connection) {
  return new Promise((resolve, reject) => {
    if (connection.state.name === 'LoggedIn') {
      resolve();
    } else {
      connection.connect(err => {
        if (err) reject(err);
        else resolve();
      });
    }
  });
}

function authenticateUser(connection, email, password) {
  return new Promise((resolve, reject) => {
    ensureConnected(connection)
      .then(() => {
        const query = `
          SELECT TOP 1 id, nome, email, senha, is_admin
          FROM users
          WHERE email = @email
           AND status_user = 1
        `;

        const request = new Request(query, (err) => {
          if (err) reject(err);
        });

        let userRows = [];

        request.on('row', columns => {
          const user = {};
          columns.forEach(column => {
            user[column.metadata.colName] = column.value;
          });
          userRows.push(user);
        });

        request.on('requestCompleted', () => {
          if (userRows.length === 0) {
            resolve(null);
          } else {
            const user = userRows[0];
            bcrypt.compare(password, user.senha)
              .then(isMatch => {
                if (isMatch) {
                  resolve(user);
                } else {
                  resolve(null); 
                }
              })
              .catch(err => reject(err));
          }
        });

        request.addParameter('email', TYPES.VarChar, email);
        connection.execSql(request);
      })
      .catch(reject);
  });
}

module.exports = { authenticateUser };