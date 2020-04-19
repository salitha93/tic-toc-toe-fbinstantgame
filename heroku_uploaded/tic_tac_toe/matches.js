var pg = require('pg');
const { Pool } = require('pg');
var crypto = require('crypto-js');

//const pool = new Pool();

module.exports = function(app) {
    app.post('/save-match', function(request, response) {
        var contextId = request.body.contextId;
        var signature = request.body.signature;
        var player = request.body.player;
        
        var isValid = validate(signature);
        
        if (isValid) {
            var data = getEncodedData(signature);
            saveMatchDataAsync(contextId, data)
            .then(function(result){
                response.json({'success':true});
            })
            .catch(function(err){
                response.json({'success':false, 'error':err});
            });
        } else {
            console.log('encoded data', getEncodedData(signature));
            response.json({'success': false, 'error': {message:'invalid signature'}});
        }
    })
    
    app.post('/get-match', function(request, response) {
        var signature = request.body.signature;
        
        console.log("isValiding ");
        var isValid = validate(signature);
        console.log("isValid: "+isValid);

        if (isValid) {
            var contextId = getEncodedData(signature);
            loadMatchDataAsync(contextId)
            .then(function(result){
                if (result) {
                    response.json({'success':true, 'contextId':contextId, 'empty': false, 'data':result});
                } else {
                    response.json({'success':true, 'contextId':contextId, 'empty': true});
                }
            })
            .catch(function(err){
                response.json({'success':false, 'error':err});
            });
        } else {
            console.log('encoded data', getEncodedData(signature));
            response.json({'success':false, 'error':'invalid signature'});
        }
        
    })
   /* const pool = new Pool({
        user: 'dbuser',
        host: 'database.server.com',
        database: 'mydb',
        password: 'secretpassword',
        port: 3211,
      })*/
    saveMatchDataAsync = function(contextId, data) {
        return new Promise(function(resolve, reject){
            //pg.connect(process.env.DATABASE_URL, function(err, client, done) {

            const pool = new Pool({
                    user: 'cmadzxzjffycrd',
                    host: 'ec2-54-210-128-153.compute-1.amazonaws.com',
                    database: 'd21j06c1hisi16',
                    password: 'a52d1331b37ad77ca298b65a800d8e4a034fc162ca609fbc3f13c7fc9a7740d6',
                    port: 5432,
              })
            // the pool will emit an error on behalf of any idle clients
            // it contains if a backend error or network partition happens
            pool.on('error', (err, client) => {
                console.error('Unexpected error on idle client', err)
                process.exit(-1)
            })

            // callback - checkout a client
            pool.connect((err, client, done) => {
                if (err) throw err

                client.query('SELECT * FROM matches WHERE context = $1::text', [contextId], function(err, result) {
                    if (err) {
                        reject(err)
                    } 
                    
                    if (result.rows.length > 0) {
                        // Update current match
                        client.query('UPDATE matches SET data = $1::text WHERE context = $2::text', [data, contextId], function(upd_err, upd_result) {
                            done();
                            if (err) {
                                reject(err);
                            }
                            resolve();
                        });
                    }
                    else {
                        // Insert new match
                        client.query('INSERT INTO matches (context, data) VALUES ($1::text, $2::text)', [contextId, data], function(ist_err, ist_result) {
                            done();
                            if (err) {
                                reject(err);
                            }
                            resolve();
                        });
                    }
                });
            });
        });
    };
    


    loadMatchDataAsync = function(contextId) {
        return new Promise(function(resolve, reject){
            //pg.connect(process.env.DATABASE_URL, function(err, client, done) {

                const pool = new Pool({
                    user: 'cmadzxzjffycrd',
                    host: 'ec2-54-210-128-153.compute-1.amazonaws.com',
                    database: 'd21j06c1hisi16',
                    password: 'a52d1331b37ad77ca298b65a800d8e4a034fc162ca609fbc3f13c7fc9a7740d6',
                    port: 5432,
                  })
                // the pool will emit an error on behalf of any idle clients
                // it contains if a backend error or network partition happens
                pool.on('error', (err, client) => {
                    console.error('Unexpected error on idle client', err)
                    process.exit(-1)
                })
    
                // callback - checkout a client
                pool.connect((err, client, done) => {
                    if (err)
                    {
                        throw err;
                    }
                    else
                    {
                        client.query('SELECT * FROM matches WHERE context = $1::text', [contextId], function(err, result) 
                        {
                            done();
                            if (err) 
                            {
                                reject(err);
                            }
                            console.log(result);
                            console.log("Error: "+err);
                            if (result.rows.length > 0) 
                            {
                                resolve(result.rows[0].data);
                            } 
                            else 
                            {
                                resolve();
                            }    
                        });
                    }
            });
        });
    };
    
    validate = function(signedRequest) {
        // You can set USE_SECURE_COMMUNICATION to false 
        // when doing local testing and using the FBInstant mock SDK
        if (process.env.USE_SECURE_COMMUNICATION == false){
            console.log('Not validating signature')
            return true;
        }

        try{
            
            var firstpart = signedRequest.split('.')[0];
            var replaced = firstpart.replace(/-/g, '+').replace(/_/g, '/');
            var signature = crypto.enc.Base64.parse(replaced).toString();
            const dataHash = crypto.HmacSHA256(signedRequest.split('.')[1], process.env.APP_SECRET).toString();
            var isValid = signature === dataHash;
            if (!isValid) {
                console.log('Invalid signature');
                console.log('firstpart', firstpart);
                console.log('replaced ', replaced);
                console.log('Expected', dataHash);
                console.log('Actual', signature);
            }
            
            return isValid;
        } catch (e) {
            return false;
        }
    };
    
    getEncodedData = function(signedRequest) {
        // You can set USE_SECURE_COMMUNICATION to false 
        // when doing local testing and using the FBInstant mock SDK
        if (process.env.USE_SECURE_COMMUNICATION === false){
            return payload;
        }

        try {
            
            const json = crypto.enc.Base64.parse(signedRequest.split('.')[1]).toString(crypto.enc.Utf8);
            const encodedData = JSON.parse(json);
            
            /*
            Here's an example of encodedData can look like
            { 
                algorithm: 'HMAC-SHA256',
                issued_at: 1520009634,
                player_id: '123456789',
                request_payload: 'backend_save' 
            } 
            */
            
            return encodedData.request_payload;
        } catch (e) {
            return null;
        }
    };
}

