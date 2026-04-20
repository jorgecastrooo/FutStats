const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const apicache = require('apicache');
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'jhuygtrfdhggtrdfgkmnftuikjgykmnxse3sdbgt5uijhgty87ituui8iuhti5355652368755362353' // Altere para uma chave complexa


const app = express();
const port = 3000;

const { Connection, Request, TYPES } = require('tedious');
const config = {
  server: 'P13P50104\\SQLEXPRESS',
  authentication: {
    type: 'default',
    options: {
      userName: 'user',
      password: '1234',
    },
  },
  options: {
    port: 1433,
    database: 'FutStats',
    trustServerCertificate: true,
  },
};




const API_KEY = '97228973678445f2a894481e02aabf17';
const CACHE_TTL = 60 * 5; 
const API_RATE_LIMIT_WINDOW = 60 * 1000; 
const API_RATE_LIMIT_MAX = 12; 


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cache = new NodeCache({ stdTTL: CACHE_TTL });
const apiCache = apicache.middleware;


const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW,
  max: API_RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});


app.use('/api', apiLimiter);


function makeFootballDataRequest(url, req, res, isFavorite) {
  axios.get(url, { headers: { 'X-Auth-Token': API_KEY } })
    .then(response => {
      res.json({
        ...response.data,
        isFavorite, 
      });
    })
    .catch(error => {
      console.error('Erro ao buscar dados da API:', error);
      res.status(500).json({ error: 'Erro ao buscar dados da API' });
    });
}


app.get('/api/competitions', apiCache('5 minutes'), async (req, res) => {
  await makeFootballDataRequest('https://api.football-data.org/v4/competitions/', req, res);
});

app.get('/api/competitions/:leagueCode/standings', apiCache('2 minutes'), async (req, res) => {
  const { leagueCode } = req.params;

  try {
    const response = await axios.get(`https://api.football-data.org/v4/competitions/${leagueCode}/standings`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('❌ Erro ao obter classificação da liga:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erro ao obter classificação',
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Erro interno ao obter classificação',
      message: error.message
    });
  }
});

app.get('/api/favorites/check', authenticateToken, async (req, res) => {
  const { itemId, itemType } = req.query;


  if (!itemId || !itemType) {
    return res.status(400).json({ error: 'Parâmetros itemId e itemType são obrigatórios' });
  }

  const connection = new Connection(config);

  try {
    const isFavorite = await new Promise((resolve, reject) => {
      connection.on('connect', err => {
        if (err) return reject(err);

        const request = new Request(
          `SELECT COUNT(*) AS total 
           FROM favoritos f
           INNER JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
           WHERE f.id_users = @userId 
             AND tf.tipo = @itemType 
             AND tf.id_fav = @itemId`,
          (err) => {
            if (err) {
              connection.close();
              return reject(err);
            }
          }
        );

        request.on('row', columns => {
          const result = columns[0].value > 0;
          console.log(`Favorito verificado: ${result} para ${itemType} ${itemId}`);
          resolve(result);
        });

        request.addParameter('userId', TYPES.Int, req.user.id);
        request.addParameter('itemType', TYPES.VarChar, itemType);
        request.addParameter('itemId', TYPES.VarChar, itemId);
        

        connection.execSql(request);
      });
      
      connection.on('end', () => resolve(false)); 
      connection.connect();
    });

    res.json({ isFavorite });

  } catch (error) {
    console.error('Erro na verificação de favorito:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar favorito',
      details: error.message 
    });
  }
});

app.get('/api/competitions/:leagueCode/scorers', apiCache('2 minutes'), async (req, res) => {
  const { leagueCode } = req.params;
  await makeFootballDataRequest(
    `https://api.football-data.org/v4/competitions/${leagueCode}/scorers`,
    req,
    res
  );
});

app.get('/api/teams/:teamId', apiCache('30 minutes'), async (req, res) => {
  console.log('🔵 [GET /api/teams] Iniciando requisição');
  console.log(`🆔 TeamID recebido: ${req.params.teamId}`);

  try {
    const { teamId } = req.params;
    const teamIdInt = parseInt(teamId);

    if (isNaN(teamIdInt)) {
      console.error('❌ ID do time inválido:', teamId);
      return res.status(400).json({ error: 'ID do time inválido' });
    }

    console.log('🌐 Buscando dados na API Football Data...');
    const apiResponse = await axios.get(
      `https://api.football-data.org/v4/teams/${teamIdInt}`,
      {
        headers: { 
          'X-Auth-Token': API_KEY,
          'Accept-Encoding': 'gzip' 
        },
        timeout: 8000
      }
    );
    console.log('✅ Dados da API obtidos com sucesso');

    const responseData = {
      ...apiResponse.data,
      isFavorite: false // O status de favorito agora é obtido pelo novo endpoint separado.
    };

    console.log('📤 Enviando resposta:', {
      teamId: teamIdInt,
      teamName: apiResponse.data.name
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Erro no endpoint /api/teams:', {
      message: error.message,
      stack: error.stack,
      teamId: req.params.teamId
    });

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ 
      error: error.response?.data?.message || 'Erro ao processar requisição'
    });
  }
});

app.get('/api/favorites/team/:teamId',authenticateToken, async (req, res) => {
  console.log('🔵 [GET /api/favorites/team] Verificando favorito');
  console.log(`🆔 TeamID recebido: ${req.params.teamId}`);

  let connection = null;

  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const teamIdInt = parseInt(teamId);

    if (isNaN(teamIdInt)) {
      console.error(' ID do time inválido:', teamId);
      return res.status(400).json({ error: 'ID do time inválido' });
    }

    console.log('🔍 Criando nova conexão com o banco de dados...');
    connection = new Connection(config);

    const isFavorite = await new Promise((resolve, reject) => {
      connection.connect(err => {
        if (err) {
          console.error(' Erro na conexão com o banco:', err);
          return reject(err);
        }

        console.log(' Conexão com o banco estabelecida');
        console.log(` Verificando se o time ${teamIdInt} é favorito para o usuário 1`);

        const request = new Request(
          `SELECT COUNT(*) AS favCount FROM favoritos f
           JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
           WHERE f.id_users = @userId 
           AND tf.tipo = 'clube' 
           AND tf.id_fav = @teamId`,
          (err) => {
            if (err) {
              console.error(' Erro na query:', err);
              return reject(err);
            }
          }
        );
        request.addParameter('userId', TYPES.Int, userId);
        request.addParameter('teamId', TYPES.Int, teamIdInt);

        let favCount = 0;

        request.on('row', columns => {
          favCount = columns[0].value;
          console.log(` Resultado da query: ${favCount} registros encontrados`);
        });

        request.on('requestCompleted', () => {
          const favoriteStatus = favCount > 0;
          console.log(` Status de favorito: ${favoriteStatus}`);


          connection.close();
          console.log(' Conexão com o banco encerrada após consulta.');

          resolve(favoriteStatus);
        });

        console.log(' Executando query no banco...');
        connection.execSql(request);
      });
    });

    res.json({ teamId: teamIdInt, isFavorite });

  } catch (error) {
    console.error(' Erro no endpoint /api/favorites/team:', {
      message: error.message,
      stack: error.stack,
      teamId: req.params.teamId
    });

    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});


app.get('/api/teams/:teamId/matches', apiCache('10 minutes'), async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const teamIdInt = parseInt(teamId);
    if (isNaN(teamIdInt)) {
      return res.status(400).json({ 
        error: 'ID do time inválido',
        details: `O ID ${teamId} não é um número válido`
      });
    }


    const url = `https://api.football-data.org/v4/teams/${teamIdInt}/matches`;
    
    const response = await axios.get(url, {
      headers: { 
        'X-Auth-Token': API_KEY,
        'Accept-Encoding': 'gzip'
      },
      timeout: 8000
    });

    const matches = response.data.matches.map(match => ({
      id: match.id,
      utcDate: match.utcDate,
      status: match.status,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        crest: match.homeTeam.crest
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        crest: match.awayTeam.crest
      },
      score: {
        fullTime: match.score.fullTime
      }
    }));

    res.json({ matches });

  } catch (error) {
    console.error('Erro no endpoint /api/teams/:teamId/matches:', {
      error: error.message,
      teamId: req.params.teamId,
      stack: error.stack
    });

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      error: error.response?.data?.message || 'Erro ao buscar partidas do time',
      details: error.message
    });
  }
});


app.get('/api/persons/:personId', apiCache('30 minutes'), async (req, res) => {
  const { personId } = req.params;
  await makeFootballDataRequest(
    `https://api.football-data.org/v4/persons/${personId}`,
    req,
    res
  );
});


app.get('/api/persons/:personId/matches', apiCache('10 minutes'), async (req, res) => {
  const { personId } = req.params;
  await makeFootballDataRequest(
    `https://api.football-data.org/v4/persons/${personId}/matches?status=FINISHED`,
    req,
    res
  );
});


app.get('/api/matches/:matchId', apiCache('60 minutes'), async (req, res) => {
  const { matchId } = req.params;
  await makeFootballDataRequest(
    `https://api.football-data.org/v4/matches/${matchId}`,
    req,
    res
  );
});


app.get('/api/matches/:matchId/head2head', apiCache('30 minutes'), async (req, res) => {
  const { matchId } = req.params;
  const { limit = 50 } = req.query;
  await makeFootballDataRequest(
    `https://api.football-data.org/v4/matches/${matchId}/head2head?limit=${limit}`,
    req,
    res
  );
});

app.get('/api/competitions/:leagueCode/matches', apiCache('5 minutes'), async (req, res) => {
  const { leagueCode } = req.params;
  const { matchday } = req.query;
  
  let url = `https://api.football-data.org/v4/competitions/${leagueCode}/matches`;
  if (matchday) {
    url += `?matchday=${matchday}`;
  }
  
  await makeFootballDataRequest(url, req, res);
});


app.get('/api/clear-cache', (req, res) => {
  cache.flushAll();
  apicache.clear();
  res.json({ message: 'Cache cleared' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

    
app.get('/api/users/me', authenticateToken, async (req, res) => {
  console.log('Recebida requisição para perfil do usuário');
  
  try {
    const connection = new Connection(config);
    
    connection.on('connect', (err) => {
      if (err) {
        console.error('Erro de conexão:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Erro de conexão com o banco',
          details: err.message 
        });
      }

      const query = `
        SELECT 
          u.id, 
          u.nome, 
          u.email, 
          FORMAT(u.data_nas, 'yyyy-MM-dd') as data_nas,
          n.nome_nascion as nacionalidade
        FROM users u
        LEFT JOIN nacionalidades n ON u.id_nacion = n.id_nacion_
        WHERE u.id = @userId
      `;

      const request = new Request(query, (err) => {
        if (err) console.error('Erro na requisição:', err);
      });

      let userData = null;

      request.on('row', (columns) => {
        userData = {
          id: columns[0].value,
          nome: columns[1].value,
          email: columns[2].value,
          data_nas: columns[3].value,
          nacionalidade: columns[4]?.value || null
        };
      });

      request.on('requestCompleted', () => {
        if (userData) {
          console.log('Dados retornados:', userData);
          res.json({
            success: true,
            data: userData
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Usuário não encontrado'
          });
        }
        connection.close();
      });

      request.addParameter('userId', TYPES.Int, req.user.id);
      connection.execSql(request);
    });

    connection.connect();
    
  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
      details: error.message
    });
  }
});

app.post('/api/user/update-profile', authenticateToken, async (req, res) => {
  const { name, email, birthdate, nationality } = req.body;
  const userId = req.user.id; 

  if (!name || !email || !birthdate || !nationality) {
    return res.status(400).json({ 
      success: false,
      message: 'Todos os campos são obrigatórios' 
    });
  }

  const connection = new Connection(config);

  try {
    await new Promise((resolve, reject) => {
      connection.on('connect', err => {
        if (err) reject(err);
        else resolve();
      });
      connection.connect();
    });

    const emailCheck = await new Promise((resolve, reject) => {
      const request = new Request(
        'SELECT id FROM users WHERE email = @email AND id != @userId',
        (err) => err && reject(err)
      );

      request.addParameter('email', TYPES.VarChar, email);
      request.addParameter('userId', TYPES.Int, userId);

      let results = [];
      request.on('row', columns => results.push({ id: columns[0].value }));
      request.on('requestCompleted', () => resolve(results));
      request.on('error', reject);
      
      connection.execSql(request);
    });

    if (emailCheck.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Este email já está em uso por outro utilizador' 
      });
    }

    const nationalityCheck = await new Promise((resolve, reject) => {
      const request = new Request(
        'SELECT id_nacion_ FROM nacionalidades WHERE nome_nascion = @nationality',
        (err) => err && reject(err)
      );

      request.addParameter('nationality', TYPES.VarChar, nationality);

      let results = [];
      request.on('row', columns => results.push({ id_nacion_: columns[0].value }));
      request.on('requestCompleted', () => resolve(results));
      request.on('error', reject);
      
      connection.execSql(request);
    });

    if (nationalityCheck.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'A nacionalidade inserida não é válida' 
      });
    }
    const nationalityId = nationalityCheck[0].id_nacion_;

    await new Promise((resolve, reject) => {
      const request = new Request(
        `UPDATE users 
         SET nome = @name, 
             email = @email, 
             data_nas = @birthdate, 
             id_nacion = @nationalityId
         WHERE id = @userId`,
        (err) => err && reject(err)
      );

      request.addParameter('name', TYPES.VarChar, name);
      request.addParameter('email', TYPES.VarChar, email);
      request.addParameter('birthdate', TYPES.Date, new Date(birthdate));
      request.addParameter('nationalityId', TYPES.Int, nationalityId);
      request.addParameter('userId', TYPES.Int, userId);

      request.on('requestCompleted', resolve);
      request.on('error', reject);
      
      connection.execSql(request);
    });

    return res.json({ 
      success: true,
      message: 'Perfil atualizado com sucesso',
      updatedData: { 
        name, 
        email, 
        birthdate: new Date(birthdate).toISOString(), 
        nationality 
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor ao atualizar perfil' 
    });
  } finally {
    connection.close();
  }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; 

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false,
      message: 'Por favor preencha todos os campos' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false,
      message: 'A password deve ter no mínimo 6 caracteres' 
    });
  }

  const connection = new Connection(config);

  try {
    await new Promise((resolve, reject) => {
      connection.on('connect', err => err ? reject(err) : resolve());
      connection.connect();
    });

    const user = await new Promise((resolve, reject) => {
      const request = new Request(
        'SELECT senha FROM users WHERE id = @userId',
        (err) => err && reject(err)
      );

      request.addParameter('userId', TYPES.Int, userId);
      
      let userData = null;
      request.on('row', columns => {
        userData = { senha: columns[0].value };
      });
      request.on('requestCompleted', () => resolve(userData));
      request.on('error', reject);
      
      connection.execSql(request);
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Conta não encontrada' 
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.senha);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Password atual incorreta' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await new Promise((resolve, reject) => {
      const request = new Request(
        'UPDATE users SET senha = @newPassword WHERE id = @userId',
        (err) => err && reject(err)
      );

      request.addParameter('newPassword', TYPES.VarChar, hashedNewPassword);
      request.addParameter('userId', TYPES.Int, userId);

      request.on('requestCompleted', resolve);
      request.on('error', reject);
      
      connection.execSql(request);
    });

    return res.json({ 
      success: true,
      message: 'Password atualizada com sucesso' 
    });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Ocorreu um erro no servidor' 
    });
  } finally {
    connection.close();
  }
});

app.post('/api/favorites/toggle',authenticateToken, async (req, res) => {
  const { itemId, itemType } = req.body;
  const userId = req.user.id;
  const connection = new Connection(config);

  try {
    await new Promise((resolve, reject) => {
      connection.on('connect', err => (err ? reject(err) : resolve()));
      connection.connect();
    });

    const tipoFavQuery = `
      SELECT id_tipos_fav_ FROM tipos_favoritos 
      WHERE tipo = @itemType AND id_fav = @itemId
    `;
    console.log("itemId:",itemId)
    const tipoFavRequest = new Request(tipoFavQuery, (err) => {
      if (err) throw err;
    });
    
    tipoFavRequest.addParameter('itemType', TYPES.VarChar, itemType);
    tipoFavRequest.addParameter('itemId', TYPES.VarChar, itemId);
    
    let tipoFavId = null;
    tipoFavRequest.on('row', columns => {
      tipoFavId = columns[0].value;
    });
    
    await new Promise((resolve, reject) => {
      tipoFavRequest.on('requestCompleted', resolve);
      tipoFavRequest.on('error', reject);
      connection.execSql(tipoFavRequest);
    });

    if (!tipoFavId) {
      const insertTipoQuery = `
        INSERT INTO tipos_favoritos (tipo, id_fav) 
        OUTPUT INSERTED.id_tipos_fav_
        VALUES (@itemType, @itemId)
      `;
      
      const insertTipoRequest = new Request(insertTipoQuery, (err) => {
        if (err) throw err;
      });
      
      insertTipoRequest.addParameter('itemType', TYPES.VarChar, itemType);
      insertTipoRequest.addParameter('itemId', TYPES.VarChar, itemId);
      
      await new Promise((resolve, reject) => {
        insertTipoRequest.on('row', columns => {
          tipoFavId = columns[0].value;
        });
        insertTipoRequest.on('requestCompleted', resolve);
        insertTipoRequest.on('error', reject);
        connection.execSql(insertTipoRequest);
      });
    }

    const checkFavQuery = `
      SELECT id_fav FROM favoritos 
      WHERE id_users = @userId AND id_tipos_fav = @tipoFavId
    `;
    
    const checkFavRequest = new Request(checkFavQuery, (err) => {
      if (err) throw err;
    });
    
    checkFavRequest.addParameter('userId', TYPES.Int, userId);
    checkFavRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
    
    let isFavorite = false;
    checkFavRequest.on('row', () => {
      isFavorite = true;
    });
    
    await new Promise((resolve, reject) => {
      checkFavRequest.on('requestCompleted', resolve);
      checkFavRequest.on('error', reject);
      connection.execSql(checkFavRequest);
    });

    if (isFavorite) {
      const deleteQuery = `
        DELETE FROM favoritos 
        WHERE id_users = @userId AND id_tipos_fav = @tipoFavId
      `;
      
      const deleteRequest = new Request(deleteQuery, (err) => {
        if (err) throw err;
      });
      
      deleteRequest.addParameter('userId', TYPES.Int, userId);
      deleteRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
      
      await new Promise((resolve, reject) => {
        deleteRequest.on('requestCompleted', resolve);
        deleteRequest.on('error', reject);
        connection.execSql(deleteRequest);
      });
      
      const checkRefQuery = `
        SELECT COUNT(*) as count FROM favoritos WHERE id_tipos_fav = @tipoFavId
      `;
      
      const checkRefRequest = new Request(checkRefQuery, (err) => {
        if (err) throw err;
      });
      
      checkRefRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
      
      let refCount = 0;
      checkRefRequest.on('row', columns => {
        refCount = columns[0].value;
      });
      
      await new Promise((resolve, reject) => {
        checkRefRequest.on('requestCompleted', resolve);
        checkRefRequest.on('error', reject);
        connection.execSql(checkRefRequest);
      });
      
      if (refCount === 0) {
        const deleteTipoQuery = `
          DELETE FROM tipos_favoritos WHERE id_tipos_fav_ = @tipoFavId
        `;
        
        const deleteTipoRequest = new Request(deleteTipoQuery, (err) => {
          if (err) throw err;
        });
        
        deleteTipoRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
        
        await new Promise((resolve, reject) => {
          deleteTipoRequest.on('requestCompleted', resolve);
          deleteTipoRequest.on('error', reject);
          connection.execSql(deleteTipoRequest);
        });
      }
      
      return res.json({ 
        success: true, 
        action: 'removed',
        message: 'Removido dos favoritos' 
      });
    } else {
      const insertQuery = `
        INSERT INTO favoritos (id_users, id_tipos_fav) 
        VALUES (@userId, @tipoFavId)
      `;
      
      const insertRequest = new Request(insertQuery, (err) => {
        if (err) throw err;
      });
      
      insertRequest.addParameter('userId', TYPES.Int, userId);
      insertRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
      
      await new Promise((resolve, reject) => {
        insertRequest.on('requestCompleted', resolve);
        insertRequest.on('error', reject);
        connection.execSql(insertRequest);
      });
      
      return res.json({ 
        success: true, 
        action: 'added',
        message: 'Adicionado aos favoritos' 
      });
    }
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor',
      error: error.message 
    });
  } finally {
    if (connection && connection.state.name !== 'Final') {
      connection.close();
    }
  }
});

app.get('/api/favorites', authenticateToken,async (req, res) => {
  const { itemType } = req.query;
  const connection = new Connection(config);
const {userId} =req.user.id;
  try {
    await new Promise((resolve, reject) => {
      connection.on('connect', err => err ? reject(err) : resolve());
      connection.connect();
    });

    const query = `
      SELECT tf.id_fav 
      FROM favoritos f
      JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
      WHERE f.id_users = @userId AND tf.tipo = @itemType
    `;

    const request = new Request(query, (err) => {
      if (err) throw err;
    });

    request.addParameter('userId', TYPES.Int, userId);
    request.addParameter('itemType', TYPES.VarChar, itemType);

    const favorites = [];
    request.on('row', columns => {
      favorites.push(columns[0].value);
    });

    await new Promise((resolve, reject) => {
      request.on('requestCompleted', resolve);
      request.on('error', reject);
      connection.execSql(request);
    });

    res.json(favorites);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection && connection.state.name !== 'Final') {
      connection.close();
    }
  }
});

app.get('/api/favoritos/ligas', authenticateToken, async (req, res) => {
  const idUser = req.user.id; // Correção aqui

  const connection = new Connection(config);
  let resSent = false; // Flag para evitar múltiplos res.json

  connection.on('connect', (err) => {
    if (err) {
      resSent = true;
      return res.status(500).json({ 
        error: 'Erro de conexão à base de dados',
        details: err.message 
      });
    }

    const ligasFavoritasCodes = [];

    const request = new Request(
      `SELECT tf.id_fav AS liga_id
       FROM favoritos f
       INNER JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
       WHERE f.id_users = @idUser AND tf.tipo = 'liga'`,
      (err) => {
        if (err && !resSent) {
          resSent = true;
          connection.close();
          return res.status(500).json({ 
            error: 'Erro ao obter ligas favoritas',
            details: err.message 
          });
        }
      }
    );

    request.addParameter('idUser', TYPES.Int, parseInt(idUser));

    request.on('row', (columns) => {
      const ligaCode = columns[0].value;
      console.log(`🎯 Encontrada liga favorita com código: ${ligaCode}`);
      ligasFavoritasCodes.push(ligaCode);
    });

    request.on('requestCompleted', async () => {
      if (resSent) return;
      connection.close();

      if (ligasFavoritasCodes.length === 0) {
        resSent = true;
        return res.json({ ligas: [] });
      }

      try {
        const ligasFavoritas = await Promise.all(
          ligasFavoritasCodes.map(async (code) => {
            try {
              const response = await axios.get(`https://api.football-data.org/v4/competitions/${code}`, {
                headers: { 'X-Auth-Token': API_KEY },
              });

              const formatted = {
                id: response.data.id,
                code: response.data.code,
                name: response.data.name,
                area: response.data.area.name,
                logo: response.data.emblem || null
              };

              console.log('✅ Liga formatada:', formatted);
              return formatted;

            } catch (error) {
              console.error(`❌ Erro ao buscar liga ${code}:`, error.message);
              return null;
            }
          })
        );

        const ligasValidas = ligasFavoritas.filter(liga => liga !== null);

        resSent = true;
        res.json({ 
          ligas: ligasValidas,
          total: ligasValidas.length
        });

      } catch (error) {
        if (!resSent) {
          resSent = true;
          res.status(500).json({ 
            error: 'Erro ao buscar detalhes das ligas favoritas',
            details: error.message 
          });
        }
      }
    });

    connection.execSql(request);
  });

  connection.on('error', (err) => {
    console.error('❌ Erro na conexão SQL Server:', err);
  });

  connection.connect();
});

app.post('/api/favorites/remove', authenticateToken, async (req, res) => {

  console.log('🔔 Iniciando requisição para /api/favorites/remove');
  console.log('📝 Dados recebidos:', req.body);
  
  const {itemId, itemType } = req.body;
  const userId = req.user.id; 
  const connection = new Connection(config);

  try {
    console.log('ℹ️ Estabelecendo conexão com o SQL Server...');
    await new Promise((resolve, reject) => {
      connection.on('connect', err => {
        if (err) {
          console.error('❌ Erro de conexão:', err);
          reject(err);
        } else {
          console.log('✅ Conexão com SQL Server estabelecida');
          resolve();
        }
      });
      connection.connect();
    });


    console.log('🔍 Buscando ID do tipo de favorito...');
    const tipoFavQuery = `
      SELECT id_tipos_fav_ FROM tipos_favoritos 
      WHERE tipo = @itemType AND id_fav = @itemId
    `;
    
    console.log('📝 Executando query:', tipoFavQuery);
    console.log('📌 Parâmetros:', { itemType, itemId });
    
    const tipoFavRequest = new Request(tipoFavQuery, (err) => {
      if (err) {
        console.error('❌ Erro na query:', err);
        throw err;
      }
    });
    
    tipoFavRequest.addParameter('itemType', TYPES.VarChar, itemType);
    tipoFavRequest.addParameter('itemId', TYPES.VarChar, itemId);
    
    let tipoFavId = null;
    tipoFavRequest.on('row', columns => {
      tipoFavId = columns[0].value;
      console.log('➡️ Tipo de favorito encontrado. ID:', tipoFavId);
    });
    
    await new Promise((resolve, reject) => {
      tipoFavRequest.on('requestCompleted', () => {
        console.log('✅ Query de busca de tipo completada');
        resolve();
      });
      tipoFavRequest.on('error', reject);
      connection.execSql(tipoFavRequest);
    });

    if (!tipoFavId) {
      console.log('ℹ️ Item não encontrado nos favoritos');
      return res.status(404).json({ 
        success: false, 
        message: 'Item não encontrado nos favoritos' 
      });
    }


    console.log('🗑️ Iniciando remoção do favorito...');
    const deleteQuery = `
      DELETE FROM favoritos 
      WHERE id_users = @userId AND id_tipos_fav = @tipoFavId
    `;
    
    console.log('📝 Executando query:', deleteQuery);
    console.log('📌 Parâmetros:', { userId, tipoFavId });
    
    const deleteRequest = new Request(deleteQuery, (err) => {
      if (err) {
        console.error('❌ Erro na query de remoção:', err);
        throw err;
      }
    });
    
    deleteRequest.addParameter('userId', TYPES.Int, userId);
    deleteRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
    
    await new Promise((resolve, reject) => {
      deleteRequest.on('requestCompleted', () => {
        console.log('✅ Favorito removido com sucesso');
        resolve();
      });
      deleteRequest.on('error', reject);
      connection.execSql(deleteRequest);
    });
    

    console.log('🔍 Verificando referências restantes...');
    const checkRefQuery = `
      SELECT COUNT(*) as count FROM favoritos WHERE id_tipos_fav = @tipoFavId
    `;
    
    const checkRefRequest = new Request(checkRefQuery, (err) => {
      if (err) {
        console.error('❌ Erro na query de verificação:', err);
        throw err;
      }
    });
    
    checkRefRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
    
    let refCount = 0;
    checkRefRequest.on('row', columns => {
      refCount = columns[0].value;
      console.log(`📊 Referências encontradas: ${refCount}`);
    });
    
    await new Promise((resolve, reject) => {
      checkRefRequest.on('requestCompleted', resolve);
      checkRefRequest.on('error', reject);
      connection.execSql(checkRefRequest);
    });
    

    if (refCount === 0) {
      console.log('🧹 Nenhuma referência encontrada - removendo tipo...');
      const deleteTipoQuery = `
        DELETE FROM tipos_favoritos WHERE id_tipos_fav_ = @tipoFavId
      `;
      
      const deleteTipoRequest = new Request(deleteTipoQuery, (err) => {
        if (err) {
          console.error('❌ Erro ao remover tipo:', err);
          throw err;
        }
      });
      
      deleteTipoRequest.addParameter('tipoFavId', TYPES.Int, tipoFavId);
      
      await new Promise((resolve, reject) => {
        deleteTipoRequest.on('requestCompleted', () => {
          console.log('✅ Tipo de favorito removido com sucesso');
          resolve();
        });
        deleteTipoRequest.on('error', reject);
        connection.execSql(deleteTipoRequest);
      });
    } else {
      console.log('ℹ️ Tipo de favorito mantido (ainda há referências)');
    }
    
    console.log('🎉 Remoção concluída com sucesso');
    return res.json({ 
      success: true, 
      message: 'Removido dos favoritos com sucesso' 
    });
  } catch (error) {
    console.error('❌ ERRO NO PROCESSO:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    return res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor',
      error: error.message 
    });
  } finally {
    if (connection && connection.state.name !== 'Final') {
      console.log('ℹ️ Fechando conexão com o banco de dados');
      connection.close();
    }
    console.log('🔚 Fim do processo de remoção');
  }
});

app.get('/api/favorites/clubs', authenticateToken, async (req, res) => {
  const idUser = req.user.id;

  const connection = new Connection(config);

  connection.on('connect', (err) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Erro de conexão à base de dados',
        details: err.message 
      });
    }

    const clubesFavoritosIds = [];

    const request = new Request(
      `SELECT tf.id_fav AS clube_id
       FROM favoritos f
       INNER JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
       WHERE f.id_users = @idUser AND tf.tipo = 'clube'`,
      (err) => {
        if (err) {
          return res.status(500).json({ 
            error: 'Erro ao obter clubes favoritos',
            details: err.message 
          });
        }
      }
    );

    request.addParameter('idUser', TYPES.Int, parseInt(idUser));

    request.on('row', (columns) => {
      const clubeId = columns[0].value;
      console.log(` Encontrado clube favorito com ID: ${clubeId}`);
      clubesFavoritosIds.push(clubeId);
    });

    request.on('requestCompleted', async () => {
      connection.close();

      if (clubesFavoritosIds.length === 0) {
        return res.json({ clubes: [] });
      }

      try {

        const clubesFavoritos = await Promise.all(
          clubesFavoritosIds.map(async (id) => {
            try {
              const response = await axios.get(`https://api.football-data.org/v4/teams/${id}`, {
                headers: { 'X-Auth-Token': API_KEY },
              });

              console.log('📋 Dados formatados:', {
                id: response.data.id,
                name: response.data.name,
                shortName: response.data.shortName,
                area: response.data.area.name,
                crest: response.data.crest,
                venue: response.data.venue,
                founded: response.data.founded,
                clubColors: response.data.clubColors
              });

              return {
                id: response.data.id,
                name: response.data.name,
                shortName: response.data.shortName,
                country: response.data.area.name,
                logo: response.data.crest,
                stadium: response.data.venue,
                founded: response.data.founded,
                colors: response.data.clubColors,
                website: response.data.website || null
              };

            } catch (error) {
              console.error(` Erro ao buscar clube ${id}:`, error.message);
              return null;
            }
          })
        );

        const clubesValidos = clubesFavoritos.filter(clube => clube !== null);
        res.json({ 
          clubes: clubesValidos,
          total: clubesValidos.length
        });
      } catch (error) {
        console.error(' Erro ao buscar clubes favoritos:', error);
        res.status(500).json({ 
          error: 'Erro ao buscar clubes favoritos',
          details: error.message 
        });
      }
    });

    connection.execSql(request);
  });

  connection.on('error', (err) => {
    console.error(' Erro na conexão SQL Server:', err);
  });

  connection.connect();
});

app.get('/api/favorites/player/:playerId', authenticateToken, async (req, res) => {
  console.log('🔵 [GET /api/favorites/player] Verificando favorito do jogador');
  console.log(`🆔 PlayerID recebido: ${req.params.playerId}`);

  let connection = null;

  try {
    const { playerId } = req.params;
    const playerIdInt = parseInt(playerId);

    if (isNaN(playerIdInt)) {
      console.error('❌ ID do jogador inválido:', playerId);
      return res.status(400).json({ error: 'ID do jogador inválido' });
    }

    const userId = req.user.id; 

    console.log('🔍 Criando nova conexão com o banco de dados...');
    connection = new Connection(config);

    const isFavorite = await new Promise((resolve, reject) => {
      connection.connect(err => {
        if (err) {
          console.error('❌ Erro na conexão com o banco:', err);
          return reject(err);
        }

        console.log('✅ Conexão com o banco estabelecida');
        console.log(`🔍 Verificando se o jogador ${playerIdInt} é favorito para o usuário ${userId}`);

        const request = new Request(
          `SELECT COUNT(*) AS favCount FROM favoritos f
           JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
           WHERE f.id_users = @userId
           AND tf.tipo = 'jogador'
           AND tf.id_fav = @playerId`,
          (err) => {
            if (err) {
              console.error('❌ Erro na query:', err);
              return reject(err);
            }
          }
        );

        request.addParameter('playerId', TYPES.Int, playerIdInt);
        request.addParameter('userId', TYPES.Int, userId);

        let favCount = 0;

        request.on('row', columns => {
          favCount = columns[0].value;
          console.log(`📊 Resultado da query: ${favCount} registros encontrados`);
        });

        request.on('requestCompleted', () => {
          const favoriteStatus = favCount > 0;
          console.log(`⭐ Status de favorito: ${favoriteStatus}`);

          connection.close();
          console.log('🔌 Conexão com o banco encerrada após consulta.');

          resolve(favoriteStatus);
        });

        console.log('⚡ Executando query no banco...');
        connection.execSql(request);
      });
    });

    res.json({ playerId: playerIdInt, isFavorite });

  } catch (error) {
    console.error('❌ Erro no endpoint /api/favorites/player:', {
      message: error.message,
      stack: error.stack,
      playerId: req.params.playerId
    });

    res.status(500).json({ error: 'Erro ao processar requisição' });
  } finally {
    if (connection && connection.state.name !== 'Final') {
      connection.close();
      console.log('🔌 Conexão com o banco encerrada no finally.');
    }
  }
});


app.get('/api/favoritos/jogadores', authenticateToken, async (req, res) => {
  const userId = req.user.id; 

  const connection = new Connection(config);

  connection.on('connect', (err) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Erro de conexão à base de dados',
        details: err.message 
      });
    }

    const jogadoresFavoritosIds = [];

    const request = new Request(
      `SELECT tf.id_fav AS jogador_id
       FROM favoritos f
       INNER JOIN tipos_favoritos tf ON f.id_tipos_fav = tf.id_tipos_fav_
       WHERE f.id_users = @idUser AND tf.tipo = 'jogador'`,
      (err) => {
        if (err) {
          return res.status(500).json({ 
            error: 'Erro ao obter jogadores favoritos',
            details: err.message 
          });
        }
      }
    );

    request.addParameter('idUser', TYPES.Int, parseInt(userId));

    request.on('row', (columns) => {
      const jogadorId = columns[0].value;
      console.log(` Encontrado jogador favorito com ID: ${jogadorId}`);
      jogadoresFavoritosIds.push(jogadorId);
    });

    request.on('requestCompleted', async () => {
      connection.close();

      if (jogadoresFavoritosIds.length === 0) {
        return res.json({ jogadores: [] });
      }

      try {
        const jogadoresFavoritos = await Promise.all(
          jogadoresFavoritosIds.map(async (id) => {
            try {
              const response = await axios.get(`https://api.football-data.org/v4/persons/${id}`, {
                headers: { 'X-Auth-Token': API_KEY },
              });

              const currentTeam = response.data.currentTeam 
                ? {
                    id: response.data.currentTeam.id,
                    name: response.data.currentTeam.name,
                    crest: response.data.currentTeam.crest || null
                  }
                : null;

              return {
                id: response.data.id,
                name: response.data.name,
                photo: response.data.photo || null,
                dateOfBirth: response.data.dateOfBirth || null,
                nationality: response.data.nationality || null,
                position: response.data.position || null,
                shirtNumber: response.data.shirtNumber || null,
                currentTeam: currentTeam
              };

            } catch (error) {
              console.error(` Erro ao buscar jogador ${id}:`, error.message);
              return null;
            }
          })
        );

        const jogadoresValidos = jogadoresFavoritos.filter(jogador => jogador !== null);
        res.json({ 
          jogadores: jogadoresValidos,
          total: jogadoresValidos.length
        });
      } catch (error) {
        console.error(' Erro ao buscar jogadores favoritos:', error);
        res.status(500).json({ 
          error: 'Erro ao buscar jogadores favoritos',
          details: error.message 
        });
      }
    });

    connection.execSql(request);
  });

  connection.on('error', (err) => {
    console.error(' Erro na conexão SQL Server:', err);
  });

  connection.connect();
});



// ========================
// Endpoints de Registro e Login
// ========================
app.post('/register', async (req, res) => {
  const { name, email, password, nationality, birthdate } = req.body;

 
  if (!name || !email || !password || !birthdate) {
    return res.status(400).json({ 
      error: 'Nome, email, senha e data de nascimento são obrigatórios.' 
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido.' });
  }

  const parsedDate = new Date(birthdate);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Data de nascimento inválida.' });
  }

  const connection = new Connection(config);

  try {
    
    await new Promise((resolve, reject) => {
      connection.on('connect', err => {
        if (err) return reject(err);
        resolve();
      });
      connection.connect();
    });


    const checkIfExists = (query, value) => {
      return new Promise((resolve, reject) => {
        let count = 0;
        const request = new Request(query, (err) => {
          if (err) return reject(err);
          resolve(count > 0);
        });
        request.on('row', columns => {
          count = columns[0].value;
        });
        request.addParameter('value', TYPES.VarChar, value);
        connection.execSql(request);
      });
    };


    const emailExists = await checkIfExists(
      'SELECT COUNT(*) as count FROM users WHERE email = @value',
      email
    );

    if (emailExists) {
      return res.status(400).json({ error: 'Este email já está registrado.' });
    }


    const nameExists = await checkIfExists(
      'SELECT COUNT(*) as count FROM users WHERE nome = @value',
      name
    );

    if (nameExists) {
      return res.status(400).json({ error: 'Este nome de utilizador já está em uso.' });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (nome, email, senha, id_nacion, data_nas, is_admin, status_user)
      VALUES (@nome, @email, @senha, @id_nacion, @data_nas, @is_admin, @status_user)
    `;

    await new Promise((resolve, reject) => {
      const request = new Request(insertQuery, (err) => {
        if (err) return reject(err);
        resolve();
      });

      request.addParameter('nome', TYPES.VarChar, name);
      request.addParameter('email', TYPES.VarChar, email);
      request.addParameter('senha', TYPES.VarChar, hashedPassword);
      request.addParameter('id_nacion', TYPES.Int, nationality || null);
      request.addParameter('data_nas', TYPES.Date, parsedDate);
      request.addParameter('is_admin', TYPES.Bit, 0);
      request.addParameter('status_user', TYPES.Bit, 1);

      connection.execSql(request);
    });

    // Sucesso
    res.status(201).json({ message: 'Usuário registrado com sucesso!' });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário. Tente novamente.' });
  } finally {
    if (connection && connection.state.name !== 'Final') {
      connection.close();
    }
  }
});
const { authenticateUser } = require('./auth');

// Rota de login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const connection = new Connection(config);
  try {
    
    const user = await authenticateUser(connection, email, password);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });


    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      SECRET_KEY,
      { expiresIn: '30m' }
    );

    res.status(200).json({
      message: 'Login realizado com sucesso!',
      token, 
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Erro durante o login:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// Rota protegida (exemplo)
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acesso permitido!', user: req.user });
});

// ========================
// Criação do Token
// ========================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); 
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

async function checkAndCreateAdmin() {
  try {
    const checkAdminQuery = 'SELECT COUNT(*) as count FROM users WHERE is_admin = 1';
    const adminCount = await new Promise((resolve, reject) => {
      let count = 0;
      const request = new Request(checkAdminQuery, (err) => {
        if (err) return reject(err);
        resolve(count);
      });
      
      request.on('row', columns => {
        count = columns[0].value;
      });
      
      connection.execSql(request);
    });

    if (adminCount === 0) {
      const adminData = {
        name: 'Admin FutStats',
        email: 'admin@futstats.com',
        password: 'Admin@1234',
        nationality: 125,
        birthdate: new Date('2006-05-21') 
      };

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);

      const insertQuery = `
        INSERT INTO users (nome, email, senha, id_nacion, data_nas, is_admin, status_user)
        VALUES (@nome, @email, @senha, @id_nacion, @data_nas, @is_admin, @status_user)
      `;

      await new Promise((resolve, reject) => {
        const request = new Request(insertQuery, (err) => {
          if (err) return reject(err);
          console.log('Usuário admin padrão criado com sucesso!');
          resolve();
        });

        request.addParameter('nome', TYPES.VarChar, adminData.name);
        request.addParameter('email', TYPES.VarChar, adminData.email);
        request.addParameter('senha', TYPES.VarChar, hashedPassword);
        request.addParameter('id_nacion', TYPES.Int, adminData.nationality);
        
        // Corrigir o tratamento da data
        request.addParameter('data_nas', TYPES.Date, adminData.birthdate, {
          format: 'YYYY-MM-DD' // Forçar formato correto
        });
        
        request.addParameter('is_admin', TYPES.Bit, 1);
        request.addParameter('status_user', TYPES.Bit, 1);

        connection.execSql(request);
      });
    }
  } catch (error) {
    console.error('Erro ao verificar/criar usuário admin:', error);
  }
}

app.put('/api/users/:id/admin', authenticateToken, authenticateAdmin, async (req, res) => {
  const userId = req.params.id;
  const { is_admin } = req.body;
  const currentUserId = req.user.id;

  if (userId == currentUserId) {
    return res.status(400).json({ error: 'Você não pode modificar suas próprias permissões' });
  }

  const query = `
    UPDATE users
    SET is_admin = @is_admin
    WHERE id = @userId
  `;

  try {
    await new Promise((resolve, reject) => {
      const request = new Request(query, (err) => {
        if (err) reject(err);
        else resolve();
      });

      request.addParameter('is_admin', TYPES.Bit, is_admin);
      request.addParameter('userId', TYPES.Int, userId);

      connection.execSql(request);
    });

    res.json({ message: 'Permissões de admin atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
});

app.get('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const currentUserId = req.user.id;

  const query = `
    SELECT id, nome, email, status_user, is_admin
    FROM users
    WHERE id != @currentUserId
  `;

  try {
    const users = await new Promise((resolve, reject) => {
      const result = [];
      const request = new Request(query, (err) => {
        if (err) return reject(err);
      });

      request.addParameter('currentUserId', TYPES.Int, currentUserId);

      request.on('row', columns => {
        result.push({
          id: columns[0].value,
          nome: columns[1].value,
          email: columns[2].value,
          status_user: columns[3].value,
          is_admin: columns[4].value
        });
      });

      request.on('requestCompleted', () => resolve(result));
      
      connection.execSql(request);
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.put('/api/users/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  const query = `
    UPDATE users
    SET status_user = @status
    WHERE id = @userId
  `;

  try {
    await new Promise((resolve, reject) => {
      const request = new Request(query, (err) => {
        if (err) reject(err);
        else resolve();
      });

      request.addParameter('status', TYPES.Bit, status);
      request.addParameter('userId', TYPES.Int, userId);

      connection.execSql(request);
    });

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

app.delete('/api/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const userId = req.params.id;
  const query = 'DELETE FROM users OUTPUT DELETED.id WHERE id = @userId';

  try {
    const deletedIds = await new Promise((resolve, reject) => {
      const result = [];
      const request = new Request(query, (err) => {
        if (err) return reject(err);
      });

      request.addParameter('userId', TYPES.Int, userId);
      
      request.on('row', columns => {
        result.push(columns[0].value);
      });

      request.on('requestCompleted', () => resolve(result));
      
      connection.execSql(request);
    });

    if (deletedIds.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar usuário:', error);
    res.status(500).json({ error: 'Erro ao eliminar usuário' });
  }
});

const connection = new Connection(config);

connection.on('connect', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
  console.log('Conexão bem-sucedida ao banco de dados.');
  
  // Verificar e criar admin se necessário
  checkAndCreateAdmin().then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Rate limit: ${API_RATE_LIMIT_MAX} requests per minute`);
      console.log(`Cache TTL: ${CACHE_TTL} seconds`);
    
    });
  });
});
connection.connect();