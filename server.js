//Author: Brayden Murphy
//CS 493 Portfolio Project 
// Adapted from example code provided in course materials for CS 493 

const express = require('express');
const app = express();
const json2html = require('json-to-html');
const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
//require('dotenv').config(); 
const request = require('request');
const datastore = new Datastore();
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const BOAT = "Boat";
const LOAD = "Load"; 
const USER = "User"; 

const router = express.Router();
const login = express.Router();

/*
const CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const DOMAIN = process.env.AUTH0_DOMAIN;
*/

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
  });

app.set('trust proxy', true);

/* ------------- Begin Lodging Model Functions ------------- */
/*
function post_user(name){
    var key = datastore.key(USER);
	const new_user = {"name": name};
	return datastore.save({"key":key, "data":new_user}).then(() => {
        new_user.id = key.id; 
        return new_user});
}

function get_users() {
    const q = datastore.createQuery(USER);
    return datastore.runQuery(q).then((entities) => {
        // Use Array.map to call the function fromDatastore. This function
        // adds id attribute to every element in the array at element 0 of
        // the variable entities
        return entities[0].map(fromDatastore);
    });
}
*/

function post_boat(name, type, length, public, owner){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length, "public": public, "owner":owner};
	return datastore.save({"key":key, "data":new_boat}).then(() => {
        new_boat.id = key.id; 
        return new_boat});
}

function get_boats(owner){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore).filter( item => item.owner === owner );
		});
}

function get_boats_public(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore).filter ( item => item.public === true);
		});
}

function get_boats_public_owner(owner){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore).filter ( item => item.public === true).filter(item => item.owner === owner);
		});
}

function get_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(fromDatastore);
        }
    });
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.delete(key); 
}

function errorJwtPost(){
    return [jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
        }),
      
        // Validate the audience and the issuer.
        issuer: `https://${DOMAIN}/`,
        algorithms: ['RS256']
      }), 
      function(err, req, res, next){
          res.status(401).end(); 
      }
    ]
}

function errorJwtGet(){
    return [jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
        }),
      
        // Validate the audience and the issuer.
        issuer: `https://${DOMAIN}/`,
        algorithms: ['RS256']
      }), 
      function(err, req, res, next){
            get_boats_public().then((boats) => {
                res.status(200).send(boats); 
            }); 
        }
    ]
}
/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
router.get('/', function (req, res) {
    res.status(200).json({"Success": "Get request succeeded"}); 
}); 

/*
router.get('/users', function(req, res) {
    const users = get_users().then((users) => {
        for(var i = 0; i<users.length; i++)
        {
            users[i].self = "https://cs493final-334205.uw.r.appspot.com" + users[i].id; 
        }
        res.status(200).json(users); 
    })
}); 
*/

router.get('/boats', errorJwtGet(), function(req, res){
        get_boats(req.user.sub)
        .then( (boats) => {
            res.status(200).json(boats); 
        })
});

router.get('/owners/:owner_id/boats', function(req, res){
    get_boats_public_owner(req.params.owner_id).then((boats) =>{
        res.status(200).json(boats); 
    })
}); 


router.post('/boats', errorJwtPost(), function(req, res){
    post_boat(req.body.name, req.body.type, req.body.length, req.body.public, req.user.sub).then((boat) => {
        res.status(201).json(boat).end(); 
    })
});

router.delete('/boats/:boat_id', errorJwtPost(), function(req, res){
    get_boat(req.params.boat_id).then((boat) => {
        if(boat[0] === undefined || boat[0] === null){
            res.status(403).json({"Error": "Invalid boat id"}); 
        }
        else if(req.user.sub != boat[0].owner){
            res.status(403).json({"Error": "Not owner of this boat"}); 
        }
        else {
            delete_boat(req.params.boat_id).then(() => {
                res.status(204); 
            })
        }
    }); 
}); 

/*
login.post('/', function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
            url: `https://${DOMAIN}/oauth/token`,
            headers: { 'content-type': 'application/json' },
            body:
             { grant_type: 'password',
               username: username,
               password: password,
               client_id: CLIENT_ID,
               client_secret: CLIENT_SECRET },
            json: true };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else {
            var newUser = true; 
            get_users().then((users) => {
                for(var i=0; i < users.length; i++)
                {
                    if(users[i].name == username)
                    {
                        newUser = false; 
                    }
                }
                return newUser 
            }).then( (newUser) => {
                if(newUser)
                {
                    post_user(username); 
                }
            }).then( () => {
                res.send(body); 
            }); 
            //res.send(body);
        }
    });
});

*/ 

/* ------------- End Controller Functions ------------- */

app.use('/', router);
app.use('/login', login);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});